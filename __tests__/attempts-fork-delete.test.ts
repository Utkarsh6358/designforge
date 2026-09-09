import { prisma } from "../src/lib/prisma";
import { POST as createAttempt, DELETE as deleteAttempts } from "../src/app/api/attempts/route";
import { DELETE as deleteSingleAttempt } from "../src/app/api/attempts/[id]/route";
import { NextRequest } from "next/server";

async function runTests() {
  console.log("=== Testing Attempt Forking and History Deletion ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      failed++;
    }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: "demo@lldpractice.com" },
    });
    if (!user) throw new Error("Demo user not found");

    const problem = await prisma.problem.findFirst();
    if (!problem) throw new Error("No problem found in database");

    // 1. Create a fresh attempt (from zero)
    console.log("📋 Test: Create attempt from zero");
    const freshReq = new NextRequest("http://localhost:3000/api/attempts", {
      method: "POST",
      body: JSON.stringify({ problemId: problem.id }),
    });
    const freshRes = await createAttempt(freshReq);
    const freshData = await freshRes.json();
    assert(freshRes.status === 201, "Fresh attempt created with 201");
    assert(!!freshData.id, "Fresh attempt has an id");

    // Check no submissions yet
    const freshSubmissions = await prisma.submission.findMany({
      where: { attemptId: freshData.id },
    });
    assert(freshSubmissions.length === 0, "Fresh attempt starts with 0 submissions (clean slate)");

    // 2. Add a submission to this attempt
    const sampleContent = JSON.stringify({
      classes: "ParkingLot, Floor, Spot",
      responsibilities: "Manage spots",
      relationships: "ParkingLot HAS Floor",
      designDecisions: "Strategy pattern",
    });

    const sub = await prisma.submission.create({
      data: {
        attemptId: freshData.id,
        version: 1,
        content: sampleContent,
        isDraft: false,
      },
    });

    // Add evaluation and feedback to verify cascade delete
    const evaluation = await prisma.evaluation.create({
      data: {
        submissionId: sub.id,
        evaluatorType: "rule-based",
        status: "Completed",
        overallScore: 85,
      },
    });

    await prisma.feedback.create({
      data: {
        evaluationId: evaluation.id,
        criterion: "Class Identification",
        score: 9,
        maxScore: 10,
        evidence: "Good classes",
        concern: "None",
        suggestion: "Keep it up",
        confidence: 1.0,
      },
    });

    // 3. Test forking / continuing from previous attempt
    console.log("\n📋 Test: Continue / Fork from previous attempt");
    const forkReq = new NextRequest("http://localhost:3000/api/attempts", {
      method: "POST",
      body: JSON.stringify({
        problemId: problem.id,
        forkFromAttemptId: freshData.id,
      }),
    });
    const forkRes = await createAttempt(forkReq);
    const forkData = await forkRes.json();
    assert(forkRes.status === 201, "Forked attempt created with 201");
    assert(forkData.id !== freshData.id, "Forked attempt has new distinct id");

    const forkedSubmissions = await prisma.submission.findMany({
      where: { attemptId: forkData.id },
    });
    assert(forkedSubmissions.length === 1, "Forked attempt pre-populates exactly 1 draft submission");
    assert(
      forkedSubmissions[0].content === sampleContent,
      "Forked attempt retains the exact design content from previous attempt"
    );
    assert(forkedSubmissions[0].isDraft === true, "Forked submission is in draft mode ready to edit");

    // 4. Test deleting a single attempt by ID via DELETE /api/attempts/[id]
    console.log("\n📋 Test: Delete single attempt with cascading cleanup");
    const deleteSingleReq = new Request(`http://localhost:3000/api/attempts/${freshData.id}`, {
      method: "DELETE",
    });
    const deleteSingleRes = await deleteSingleAttempt(deleteSingleReq, {
      params: Promise.resolve({ id: freshData.id }),
    });
    assert(deleteSingleRes.status === 200, "Single attempt deleted with 200");

    const checkAttempt = await prisma.attempt.findUnique({
      where: { id: freshData.id },
    });
    assert(checkAttempt === null, "Attempt record was deleted");

    const checkSub = await prisma.submission.findUnique({
      where: { id: sub.id },
    });
    assert(checkSub === null, "Submission was cascade-deleted");

    const checkEval = await prisma.evaluation.findUnique({
      where: { id: evaluation.id },
    });
    assert(checkEval === null, "Evaluation was cascade-deleted");

    const checkFeedback = await prisma.feedback.findMany({
      where: { evaluationId: evaluation.id },
    });
    assert(checkFeedback.length === 0, "Feedback records were cascade-deleted");

    // 5. Clean up forked attempt via DELETE /api/attempts?id=...
    console.log("\n📋 Test: Delete attempt via query param ?id=");
    const deleteQueryReq = new NextRequest(
      `http://localhost:3000/api/attempts?id=${forkData.id}`,
      { method: "DELETE" }
    );
    const deleteQueryRes = await deleteAttempts(deleteQueryReq);
    assert(deleteQueryRes.status === 200, "Deleted attempt via query param");

    const checkForkAttempt = await prisma.attempt.findUnique({
      where: { id: forkData.id },
    });
    assert(checkForkAttempt === null, "Forked attempt was successfully cleaned up");

    console.log("\n==================================================");
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log("==================================================");

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  }
}

runTests();
