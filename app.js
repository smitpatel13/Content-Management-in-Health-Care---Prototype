const sampleCurrentPolicy = `Colonoscopy anesthesia review policy - Version 2025.10

Policy intent: define coverage for CPT 00811 when billed with a screening or diagnostic colonoscopy.

Covered when all conditions are met:
- CPT 00811 is present.
- ICD-10 Z12.11 or K63.5 is present.
- Patient age is 65 or older OR ASA class is 3 or higher.
- Documentation must include medical necessity and the colonoscopy indication.

Prior authorization is required for CPT 00811 when billed with screening diagnosis Z12.11.

Claims missing required documentation should be routed for clinical review.`;

const sampleProposedPolicy = `Colonoscopy anesthesia review policy - Version 2026.01

Policy intent: define coverage for CPT 00811 when billed with a screening or diagnostic colonoscopy.

Covered when all conditions are met:
- CPT 00811 is present.
- ICD-10 Z12.11, K63.5, or Z86.010 is present.
- Patient age is 65 or older OR ASA class is 2 or higher OR high-risk comorbidity is documented.
- Documentation must include medical necessity, colonoscopy indication, and risk factor evidence.

Prior authorization is not required for screening diagnosis Z12.11 when the rule criteria are met.

Claims missing required documentation should be routed for clinical review with the extracted policy clause attached.`;

const selectors = {
  oldPolicy: document.querySelector("#oldPolicy"),
  newPolicy: document.querySelector("#newPolicy"),
  runDemo: document.querySelector("#runDemo"),
  evaluateClaim: document.querySelector("#evaluateClaim"),
  changeSummary: document.querySelector("#changeSummary"),
  rulesOutput: document.querySelector("#rulesOutput"),
  auditTrail: document.querySelector("#auditTrail"),
  decisionCard: document.querySelector("#decisionCard"),
  changeCount: document.querySelector("#changeCount"),
  ruleCount: document.querySelector("#ruleCount"),
  statusPill: document.querySelector("#statusPill"),
  claimCpt: document.querySelector("#claimCpt"),
  claimIcd: document.querySelector("#claimIcd"),
  claimAge: document.querySelector("#claimAge"),
  claimAsa: document.querySelector("#claimAsa"),
  claimNote: document.querySelector("#claimNote"),
};

function normalizeLines(text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractTokens(text, expression) {
  return [...new Set(Array.from(text.matchAll(expression), (match) => match[0].toUpperCase()))];
}

function extractRules(text) {
  const upperText = text.toUpperCase();
  const cptCodes = extractTokens(text, /\b\d{5}\b/g);
  const icdCodes = extractTokens(text, /\b[A-Z]\d{2}(?:\.\d{1,3})?\b/g);
  const ages = Array.from(text.matchAll(/age is (\d{2,3}) or older/gi), (match) => Number(match[1]));
  const asa = Array.from(text.matchAll(/ASA class is (\d) or higher/gi), (match) => Number(match[1]));
  const requiresPriorAuth = /prior authorization is required/i.test(text);
  const noPriorAuth = /prior authorization is not required/i.test(text);
  const documentation = normalizeLines(text)
    .filter((line) => /documentation|medical necessity|risk factor/i.test(line))
    .map((line) => line.replace(/^-\s*/, ""));

  return {
    cptCodes,
    icdCodes,
    ageMinimum: ages.length ? Math.min(...ages) : null,
    asaMinimum: asa.length ? Math.min(...asa) : null,
    comorbidityAllowed: /high-risk comorbidity/i.test(text),
    priorAuthorization: noPriorAuth ? "not required when criteria are met" : requiresPriorAuth ? "required" : "not specified",
    documentation,
    sourceVersion: upperText.match(/VERSION\s+([0-9.]+)/)?.[1] ?? "unknown",
  };
}

function summarizeChanges(oldText, newText) {
  const oldRules = extractRules(oldText);
  const newRules = extractRules(newText);
  const changes = [];

  const addedIcd = newRules.icdCodes.filter((code) => !oldRules.icdCodes.includes(code));
  if (addedIcd.length) {
    changes.push({
      title: "Diagnosis set expanded",
      detail: `New payable ICD-10 values: ${addedIcd.join(", ")}.`,
      evidence: "The proposed policy adds diagnosis coverage compared with the current version.",
    });
  }

  if (newRules.asaMinimum !== oldRules.asaMinimum) {
    changes.push({
      title: "Clinical risk threshold lowered",
      detail: `ASA threshold changes from ${oldRules.asaMinimum}+ to ${newRules.asaMinimum}+.`,
      evidence: "This can increase auto-approval volume but requires careful audit monitoring.",
    });
  }

  if (newRules.comorbidityAllowed && !oldRules.comorbidityAllowed) {
    changes.push({
      title: "Comorbidity evidence added",
      detail: "Documented high-risk comorbidity now satisfies one clinical criterion.",
      evidence: "The rule engine should capture the clause and the supporting note.",
    });
  }

  if (newRules.priorAuthorization !== oldRules.priorAuthorization) {
    changes.push({
      title: "Prior authorization stance changed",
      detail: `Prior authorization moves from "${oldRules.priorAuthorization}" to "${newRules.priorAuthorization}".`,
      evidence: "This is a high-value operational change because it affects routing and turnaround time.",
    });
  }

  return changes;
}

function renderChanges(changes) {
  selectors.changeCount.textContent = `${changes.length} items`;
  selectors.changeSummary.innerHTML = changes
    .map(
      (item) => `
        <div class="change-item">
          <strong>${item.title}</strong>
          <div>${item.detail}</div>
          <small>${item.evidence}</small>
        </div>`,
    )
    .join("");
}

function renderRules(rules) {
  const rows = [
    ["CPT", rules.cptCodes.join(", ") || "None detected"],
    ["ICD-10", rules.icdCodes.join(", ") || "None detected"],
    ["Age", rules.ageMinimum ? `${rules.ageMinimum}+` : "No age threshold"],
    ["ASA", rules.asaMinimum ? `${rules.asaMinimum}+` : "No ASA threshold"],
    ["Comorbidity", rules.comorbidityAllowed ? "High-risk documentation allowed" : "Not detected"],
    ["Prior auth", rules.priorAuthorization],
    ["Docs", rules.documentation.join(" ") || "No documentation clause detected"],
  ];

  selectors.ruleCount.textContent = `${rows.length} rules`;
  selectors.rulesOutput.innerHTML = rows
    .map(([label, value]) => `<div class="rule-chip"><span>${label}</span><div>${value}</div></div>`)
    .join("");
}

function getClaim() {
  return {
    cpt: selectors.claimCpt.value.trim().toUpperCase(),
    icd: selectors.claimIcd.value.trim().toUpperCase(),
    age: Number(selectors.claimAge.value),
    asa: Number(selectors.claimAsa.value),
    note: selectors.claimNote.value.trim(),
  };
}

function evaluateClaim(claim, rules) {
  const checks = {
    cptCovered: rules.cptCodes.includes(claim.cpt),
    diagnosisCovered: rules.icdCodes.includes(claim.icd),
    ageMeetsThreshold: rules.ageMinimum ? claim.age >= rules.ageMinimum : false,
    asaMeetsThreshold: rules.asaMinimum ? claim.asa >= rules.asaMinimum : false,
    comorbidityFound: rules.comorbidityAllowed && /diabetes|hypertension|cardiac|renal|pulmonary|comorbidity/i.test(claim.note),
    documentationFound: /medical necessity|screening|diagnostic|colonoscopy|risk/i.test(claim.note),
  };

  const clinicalCriteria =
    checks.ageMeetsThreshold || checks.asaMeetsThreshold || checks.comorbidityFound;
  const pass = checks.cptCovered && checks.diagnosisCovered && clinicalCriteria && checks.documentationFound;
  const needsReview = checks.cptCovered && checks.diagnosisCovered && !pass;
  const decision = pass ? "Auto-approve" : needsReview ? "Clinical review" : "Deny or pend";

  const reason = pass
    ? "The claim matches the proposed policy and includes supporting documentation."
    : needsReview
      ? "The claim uses covered codes but does not satisfy every extracted clinical/documentation criterion."
      : "The claim does not match the extracted code set.";

  return {
    decision,
    reason,
    checks,
    policyVersion: rules.sourceVersion,
    priorAuthorization: rules.priorAuthorization,
  };
}

function renderDecision(result) {
  const className =
    result.decision === "Auto-approve" ? "pass" : result.decision === "Clinical review" ? "review" : "deny";
  selectors.decisionCard.className = `decision-card ${className}`;
  selectors.decisionCard.innerHTML = `
    <strong>${result.decision}</strong>
    <div>${result.reason}</div>
    <small>Prior authorization: ${result.priorAuthorization}</small>
  `;
}

function runDemo() {
  const oldText = selectors.oldPolicy.value;
  const newText = selectors.newPolicy.value;
  const changes = summarizeChanges(oldText, newText);
  const rules = extractRules(newText);
  const claim = getClaim();
  const evaluation = evaluateClaim(claim, rules);

  renderChanges(changes);
  renderRules(rules);
  renderDecision(evaluation);

  selectors.auditTrail.textContent = JSON.stringify(
    {
      extractedFrom: "proposed policy text",
      policyVersion: rules.sourceVersion,
      changes,
      rules,
      claim,
      evaluation,
      demoNote:
        "This POC uses deterministic extraction for speed. A production version would combine NLP, human review, version control, and regression tests.",
    },
    null,
    2,
  );
  selectors.statusPill.textContent = "Complete";
}

selectors.oldPolicy.value = sampleCurrentPolicy;
selectors.newPolicy.value = sampleProposedPolicy;
selectors.runDemo.addEventListener("click", runDemo);
selectors.evaluateClaim.addEventListener("click", runDemo);
runDemo();
