/**
 * @file prescription.prompt.js
 * @description Centralized prompt template for prescription analysis.
 *
 * [Sprint 3 UPDATE] Now instructs Gemini to respond with strict JSON
 * matching the canonical prescription shape, since Sprint 3 introduces
 * structured extraction. The schema requested here mirrors
 * schemas/prescription.schema.js so normalization has minimal work to do.
 */

/**
 * Builds the instruction prompt sent alongside the prescription image.
 *
 * @returns {string}
 */
const buildPrescriptionAnalysisPrompt = () => {
  return `You are a medical assistant AI helping a patient understand a handwritten doctor's prescription.

Carefully read the prescription image provided and extract ALL visible information into STRICT JSON matching exactly this shape:

{
  "doctor": {
    "name": "string - doctor's full name, or 'Unknown' if not visible",
    "specialization": "string - doctor's specialization if visible, or 'General Physician'",
    "hospital": "string - hospital/clinic name if visible, or 'Not specified'"
  },
  "patient": {
    "name": "string - patient's name if visible, or 'Not specified'",
    "age": "string - patient's age if visible, or 'Not specified'",
    "date": "string - prescription date if visible, or today's date in 'DD Month YYYY' format"
  },
  "medicines": [
    {
      "name": "string - generic medicine name",
      "brandName": "string - brand name if visible, or empty string",
      "type": "string - category like 'Antibiotic', 'Painkiller', 'Antacid', 'Vitamin', 'Antihistamine', etc.",
      "dosage": "string - e.g. '500mg'",
      "frequency": "string - e.g. 'Three times a day'",
      "duration": "string - e.g. '7 days'",
      "purpose": "string - brief explanation of what this medicine does and why the patient needs it",
      "instructions": "string - how to take it, e.g. 'Take after meals with water'",
      "warnings": ["string - important warnings or precautions for this specific medicine"]
    }
  ],
  "summary": "string - a brief 1-2 sentence summary in simple language explaining what was prescribed and why",
  "specialNotes": ["string - any special instructions, dietary advice, or lifestyle recommendations from the doctor"],
  "followUp": "string - follow-up instructions if mentioned, or 'Consult doctor if symptoms persist'",
  "warnings": ["string - general warnings about drug interactions or important precautions"],
  "confidenceScore": "number between 0.0 and 1.0 representing how confident you are in this reading"
}

Rules:
- Respond with ONLY the JSON object. No markdown code fences, no explanations, no text before or after.
- If a field is not visible or legible, use the default values shown above. Do not invent medical information.
- If no medicines can be identified, return an empty array for "medicines".
- For each medicine, provide a helpful "purpose" explanation in simple patient-friendly language.
- For each medicine, include relevant "warnings" specific to that medicine (e.g. "Do not take with alcohol", "May cause drowsiness").
- Base "confidenceScore" honestly on handwriting legibility — lower it if parts are unclear.
- Ensure valid, parseable JSON with no trailing commas or comments.`
}

export { buildPrescriptionAnalysisPrompt }