// """
// Backend API endpoint for semantic search
// """

import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Load embeddings data (cached in memory)
let embeddingsData = null;
const embeddingsPath = path.join(__dirname, '../../data-processor/embeddings.json');

function loadEmbeddings() {
    if (!embeddingsData && fs.existsSync(embeddingsPath)) {
        console.log('Loading embeddings into memory...');
        embeddingsData = JSON.parse(fs.readFileSync(embeddingsPath, 'utf8'));
        console.log('✅ Embeddings loaded!');
    }
    return embeddingsData;
}

/**
 * GET /api/search/semantic
 * Semantic search using AI embeddings
 */
router.get('/semantic', async (req, res) => {
    try {
        const { query, type = 'namaste', limit = 10 } = req.query;

        if (!query || query.length < 2) {
            return res.json({ results: [] });
        }

        // Check if embeddings are generated
        if (!fs.existsSync(embeddingsPath)) {
            return res.status(503).json({
                error: 'Semantic search not available',
                message: 'Embeddings not generated. Run: python data-processor/semantic_search.py'
            });
        }

        // Call Python script for semantic search
        const pythonProcess = spawn('python', [
            path.join(__dirname, '../../data-processor/semantic_search_api.py'),
            query,
            type,
            limit.toString()
        ]);

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', async (code) => {
            if (code !== 0) {
                console.error('Python error:', errorOutput);
                return res.status(500).json({
                    error: 'Semantic search failed',
                    details: errorOutput
                });
            }

            try {
                const searchResults = JSON.parse(output);

                // Fetch full details from database
                const db = await import('../database/db.js');
                const results = [];

                for (const result of searchResults) {
                    if (type === 'namaste') {
                        const codeData = await db.query(
                            `SELECT 
                                nc.id,
                                nc.code as namaste_code,
                                nc.display as namaste_display,
                                nc.system_type,
                                nc.definition as namaste_definition,
                                COUNT(cm.id) as mapping_count
                            FROM namaste_codes nc
                            LEFT JOIN concept_mappings cm ON nc.id = cm.namaste_code_id
                            WHERE nc.id = $1
                            GROUP BY nc.id`,
                            [result.id]
                        );

                        if (codeData.rows.length > 0) {
                            results.push({
                                ...codeData.rows[0],
                                similarity_score: result.similarity,
                                search_type: 'semantic'
                            });
                        }
                    } else {
                        const codeData = await db.query(
                            `SELECT 
                                id,
                                icd_code,
                                title as icd_title,
                                module as icd_module,
                                definition as icd_definition
                            FROM icd11_codes
                            WHERE id = $1`,
                            [result.id]
                        );

                        if (codeData.rows.length > 0) {
                            results.push({
                                ...codeData.rows[0],
                                similarity_score: result.similarity,
                                search_type: 'semantic'
                            });
                        }
                    }
                }

                res.json({
                    results,
                    query,
                    search_type: 'semantic',
                    total: results.length
                });

            } catch (parseError) {
                console.error('Parse error:', parseError);
                res.status(500).json({
                    error: 'Failed to parse search results',
                    details: parseError.message
                });
            }
        });

    } catch (error) {
        console.error('Semantic search error:', error);
        res.status(500).json({
            error: 'Semantic search failed',
            message: error.message
        });
    }
});

/**
 * POST /api/search/generate-embeddings
 * Trigger embedding generation (admin only)
 */
router.post('/generate-embeddings', async (req, res) => {
    try {
        const pythonProcess = spawn('python', [
            path.join(__dirname, '../../data-processor/semantic_search.py')
        ]);

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
            console.log(data.toString());
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.error(data.toString());
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                return res.status(500).json({
                    error: 'Embedding generation failed',
                    details: errorOutput
                });
            }

            // Clear cached embeddings
            embeddingsData = null;

            res.json({
                message: 'Embeddings generated successfully',
                output: output
            });
        });

    } catch (error) {
        console.error('Embedding generation error:', error);
        res.status(500).json({
            error: 'Failed to generate embeddings',
            message: error.message
        });
    }
});

export default router;
