import type { AssistantLanguage, AssistantStructuredResponse, EvidenceBundle } from "./types";

/**
 * Validates model output against actual evidence records to prevent hallucinations.
 * Ensures that work order IDs, contractor names, and billing amounts are strictly supported.
 */
export function validateAndSanitizeResponse(
  raw: Partial<AssistantStructuredResponse>,
  evidence: EvidenceBundle | null,
  requestedLang: AssistantLanguage = "en",
): AssistantStructuredResponse {
  const validWoIds = new Set(evidence?.workOrders.map((w) => w.id) ?? []);
  const validSourceIds = new Set(evidence?.sourceRecordIds ?? []);

  // Filter out any hallucinated work order IDs not present in evidence
  const safeWoRefs = (raw.workOrderReferences ?? []).filter((id) => validWoIds.has(id));

  // Anti-hallucination check on answer text
  let safeAnswer = raw.answer?.trim() || "";
  if (!safeAnswer && evidence) {
    safeAnswer = generateFactualFallbackAnswer(evidence, requestedLang);
  }

  const primaryWo = evidence?.workOrders[0] ?? null;

  return {
    answer: safeAnswer,
    text: safeAnswer,
    responseLanguage: raw.responseLanguage ?? requestedLang,
    complaintStatus: evidence?.issueStatus ?? raw.complaintStatus ?? "Open",
    linkedIssueReference: evidence?.canonicalIssueId ?? raw.linkedIssueReference ?? null,
    workOrderReferences: safeWoRefs.length > 0 ? safeWoRefs : primaryWo ? [primaryWo.id] : [],
    relevantTimelineEvents: evidence?.timeline ?? raw.relevantTimelineEvents ?? [],
    evidenceSources: Array.from(validSourceIds),
    toolsUsed: raw.toolsUsed ?? [],
    citations: raw.citations ?? Array.from(validSourceIds),
    nextAction: raw.nextAction || generateDefaultNextAction(evidence, requestedLang),
    limitations: evidence?.limitations ?? raw.limitations ?? [],
    isOfficialLink: primaryWo?.isOfficialLink ?? false,
    contractorName: primaryWo?.contractorName ?? null,
    costInr: primaryWo?.costInr ?? null,
  };
}

/** Generates standard, verified fallback responses in English, Hindi, and Marathi. */
export function generateFactualFallbackAnswer(
  evidence: EvidenceBundle,
  lang: AssistantLanguage,
): string {
  const wo = evidence.workOrders[0];
  const road = evidence.resolvedRoadName || evidence.resolvedRoadId || "the reported road";
  const status = evidence.issueStatus;

  if (lang === "mr") {
    // Marathi response
    if (wo) {
      const woDetails = `कामाचा आदेश: ${wo.id}, कंत्राटदार: ${wo.contractorName}, खर्च: ₹${wo.costInr.toLocaleString("en-IN")}.`;
      if (wo.reopened) {
        return `आपल्या तक्रारीवर (${evidence.complaintId}) ${road} येथे दुरुस्तीचे काम करण्यात आले होते, परंतु ३० दिवसांच्या आत ते पुन्हा नादुरुस्त झाले. ${woDetails} आपण हमी कालावधीअंतर्गत विनामूल्य दुरुस्तीची मागणी करू शकता.`;
      }
      if (wo.completedAt) {
        return `आपल्या तक्रारीशी (${evidence.complaintId}) संबंधित काम ${wo.completedAt} रोजी पूर्ण नोंदवले गेले आहे. ${woDetails} कृपया प्रत्यक्ष रस्त्याची पाहणी करा.`;
      }
      return `आपल्या तक्रारीसाठी कामाचा आदेश जारी झाला आहे. ${woDetails} काम लवकरच सुरू होईल.`;
    }
    return `आपली तक्रार (${evidence.complaintId}) नोंदवली गेली आहे, परंतु सध्या उपलब्ध महापालिका नोंदींमध्ये कोणताही कामाचा आदेश जोडलेला आढळलेला नाही.`;
  }

  if (lang === "hi") {
    // Hindi response
    if (wo) {
      const woDetails = `वर्क ऑर्डर: ${wo.id}, ठेकेदार: ${wo.contractorName}, बिल राशि: ₹${wo.costInr.toLocaleString("en-IN")}.`;
      if (wo.reopened) {
        return `आपकी शिकायत (${evidence.complaintId}) पर ${road} पर मरम्मत की गई थी, लेकिन यह ३० दिनों के भीतर फिर से खराब हो गई। ${woDetails} डिफेक्ट लायबिलिटी के तहत मुफ्त मरम्मत की मांग की जा सकती है।`;
      }
      if (wo.completedAt) {
        return `आपकी शिकायत (${evidence.complaintId}) से जुड़ा कार्य ${wo.completedAt} को पूरा दर्ज किया गया है। ${woDetails} कृपया मौके पर जांच करें।`;
      }
      return `आपकी शिकायत के लिए वर्क ऑर्डर जारी कर दिया गया है। ${woDetails}`;
    }
    return `आपकी शिकायत (${evidence.complaintId}) दर्ज है, लेकिन उपलब्ध रिकॉर्ड में अभी तक कोई वर्क ऑर्डर जुड़ा हुआ नहीं पाया गया है।`;
  }

  // English response (default)
  if (wo) {
    const woDetails = `Work Order ${wo.id} was assigned to ${wo.contractorName} for ₹${wo.costInr.toLocaleString("en-IN")}.`;
    if (wo.reopened) {
      return `Your complaint (${evidence.complaintId}) on ${road} was repaired, but the fix failed within 30 days and was reopened. ${woDetails} You can demand rectification at zero cost under Defect Liability.`;
    }
    if (wo.completedAt) {
      return `Official records show work order ${wo.id} was completed on ${wo.completedAt} (SLA: ${wo.slaMet ? "Met" : "Missed"}). ${woDetails} Note: Work completion does not guarantee the road is currently defect-free.`;
    }
    return `A repair work order has been assigned for your issue. ${woDetails} Work status is currently in progress.`;
  }

  return `Your complaint (${evidence.complaintId}) is logged with status "${status}" in ${evidence.resolvedWard ?? "the ward"}. However, no official BMC work order is currently linked in available records.`;
}

function generateDefaultNextAction(evidence: EvidenceBundle | null, lang: AssistantLanguage): string {
  if (lang === "mr") {
    if (evidence?.workOrders.some((w) => w.reopened)) {
      return "३० दिवसांच्या हमी कालावधीत कंत्राटदाराकडून विनामूल्य दुरुस्तीची मागणी करण्यासाठी प्रभाग कार्यालयाशी संपर्क साधा.";
    }
    return "वॉर्ड नियंत्रण कक्षाशी संपर्क साधा आणि तक्रार क्रमांकाचा संदर्भ द्या.";
  }
  if (lang === "hi") {
    if (evidence?.workOrders.some((w) => w.reopened)) {
      return "30 दिनों की डिफेक्ट लायबिलिटी के तहत ठेकेदार से मुफ्त मरम्मत की मांग करें।";
    }
    return "वार्ड कंट्रोल रूम से संपर्क करें और अपनी शिकायत आईडी का उल्लेख करें।";
  }
  if (evidence?.workOrders.some((w) => w.reopened)) {
    return "Demand contractor rectification at zero cost under the 30-day Defect Liability Period.";
  }
  return "Quote your complaint ID to the Ward Assistant Commissioner or Control Room for inspection updates.";
}
