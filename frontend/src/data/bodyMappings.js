export const BODY_PARTS = {
    head: {
        id: 'head',
        label: "Head & Neck / Shira",
        keywords: ["headache", "migraine", "shiro", "hair", "eye", "ear", "nose", "throat", "cervical"],
        description: "Includes conditions related to the brain, eyes, ears, nose, throat, and cervical spine.",
        system: ["Nervous", "ENT"]
    },
    chest: {
        id: 'chest',
        label: "Chest / Uras",
        keywords: ["heart", "lung", "cough", "hridaya", "shwasa", "cardiac", "chest pain", "asthma"],
        description: "Includes cardiovascular and respiratory conditions affecting the thorax region.",
        system: ["Cardiovascular", "Respiratory"]
    },
    abdomen: {
        id: 'abdomen',
        label: "Abdomen / Udara",
        keywords: ["stomach", "liver", "digestion", "pitta", "gastro", "ulcer", "kidney", "pancreas", "spleen"],
        description: "Includes digestive, urinary, and metabolic conditions related to the abdominal organs.",
        system: ["Digestive", "Urinary"]
    },
    arms: {
        id: 'arms',
        label: "Arms / Bahu",
        keywords: ["shoulder", "elbow", "wrist", "hand", "finger", "arthritis", "joint pain", "frozen shoulder"],
        description: "Includes musculoskeletal conditions affecting the upper extremities.",
        system: ["Musculoskeletal"]
    },
    pelvis: {
        id: 'pelvis',
        label: "Pelvis / Kati",
        keywords: ["reproductive", "urinary", "bladder", "hip", "menstrual", "sciatica", "lumbar"],
        description: "Includes reproductive, urinary, and lower spinal conditions.",
        system: ["Reproductive", "Musculoskeletal"]
    },
    legs: {
        id: 'legs',
        label: "Legs / Sakthi",
        keywords: ["knee", "ankle", "foot", "sciatica", "varicose", "arthritis", "gout", "vata"],
        description: "Includes musculoskeletal and circulatory conditions affecting the lower extremities.",
        system: ["Musculoskeletal", "Circulatory"]
    }
};

export const MODEL_COLORS = {
    base: "#2D3E5F", // Slate Blue
    hover: "#7FEFBD", // Mint
    selected: "#00C9A7", // Teal
    outline: "#7FEFBD" // Mint Outline
};
