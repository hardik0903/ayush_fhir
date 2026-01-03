import React, { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { MODEL_COLORS } from '../../data/bodyMappings';

/**
 * Professional 3D Human Body Model
 * Uses position-based region detection for single-mesh models
 */
export function BodyModel({ onSelect, selectedPart }) {
    const { scene } = useGLTF('/models/human.glb');
    const modelRef = useRef();
    const materialsRef = useRef({});

    /**
     * Determine body region based on 3D position
     * COMPREHENSIVELY CALIBRATED thresholds from multi-angle testing:
     * Head/Neck: Y ≈ 1.45-1.67 | Chest: Y ≈ 1.06 | Abdomen: Y ≈ 0.59 | Pelvis: Y ≈ 0.22 | Legs: Y < 0
     */
    const getRegionFromPosition = (point) => {
        const { x, y, z } = point;

        // NOTE: Model is scaled by 2 and positioned at y=-1
        // Thresholds validated from front, back, and side views

        // Arms: Check FIRST - lateral positions (X > 0.6) in upper body region
        // This prevents arms from being detected as chest/abdomen
        if (Math.abs(x) > 0.6 && y > 0.5) {
            return 'arms';
        }

        // Head & Neck: top of the model (Y >= 1.35)
        // Includes both head (1.67) and neck (1.45) regions
        if (y >= 1.35) {
            return 'head';
        }

        // Chest: upper torso (Y >= 1.00 and < 1.35)
        // Measured at Y ≈ 1.06
        if (y >= 1.00) {
            return 'chest';
        }

        // Abdomen: mid torso (Y >= 0.50 and < 1.00)
        // Measured at Y ≈ 0.59
        if (y >= 0.50) {
            return 'abdomen';
        }

        // Pelvis: lower torso (Y >= 0.10 and < 0.50)
        // Measured at Y ≈ 0.22
        if (y >= 0.10) {
            return 'pelvis';
        }

        // Legs: lower body (Y < 0.10)
        // Measured at Y ≈ -0.42 (upper leg) and -1.33 (lower leg)
        return 'legs';
    };

    // Apply materials to all meshes
    useEffect(() => {
        if (!scene) return;

        console.log('Setting up 3D model with position-based detection...');

        scene.traverse((child) => {
            if (child.isMesh) {
                console.log(`Found mesh: ${child.name}`);

                // Store original material
                if (!materialsRef.current[child.name]) {
                    materialsRef.current[child.name] = child.material;
                }

                // Apply base material
                child.material = new THREE.MeshPhysicalMaterial({
                    color: MODEL_COLORS.base,
                    roughness: 0.3,
                    metalness: 0.1,
                    clearcoat: 0.3,
                    clearcoatRoughness: 0.2
                });

                // Enable shadows
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }, [scene]);

    // Update material when selection changes
    useEffect(() => {
        if (!scene) return;

        scene.traverse((child) => {
            if (child.isMesh) {
                // For now, we'll highlight the entire model when any part is selected
                // In a real implementation, you might want to use vertex colors or shaders
                const isSelected = selectedPart !== null;

                child.material = new THREE.MeshPhysicalMaterial({
                    color: isSelected ? MODEL_COLORS.selected : MODEL_COLORS.base,
                    roughness: 0.3,
                    metalness: 0.1,
                    clearcoat: 0.3,
                    clearcoatRoughness: 0.2,
                    emissive: isSelected ? MODEL_COLORS.selected : '#000000',
                    emissiveIntensity: isSelected ? 0.15 : 0
                });
            }
        });
    }, [scene, selectedPart]);

    // Handle pointer events
    const handlePointerDown = (event) => {
        // Get the intersection point in 3D space
        if (event.point) {
            const region = getRegionFromPosition(event.point);

            console.log('Click position:', {
                x: event.point.x.toFixed(2),
                y: event.point.y.toFixed(2),
                z: event.point.z.toFixed(2),
                region: region || 'unknown'
            });

            if (region) {
                onSelect(region);
            } else {
                console.warn('Could not determine region from position');
            }
        }
    };

    return (
        <primitive
            ref={modelRef}
            object={scene}
            scale={2}
            position={[0, -1, 0]}
            onPointerDown={handlePointerDown}
        />
    );
}

// Preload the model
useGLTF.preload('/models/human.glb');
