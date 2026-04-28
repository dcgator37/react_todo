const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.pgUser,
  host: process.env.pgHost,
  database: process.env.pgDatabase,
  password: process.env.pgPassword,
  port: process.env.pgPort
});

const WORKER_NAME = process.env.WORKER_NAME || "worker";
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 2000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS job_queue (
      id SERIAL PRIMARY KEY,
      todo_id INTEGER,
      job_type VARCHAR(100) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      result TEXT,
      locked_by VARCHAR(100),
      locked_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Simulates heavy CPU work.
 *
 * 10,000 loops is actually very fast for Node, so this uses a larger number.
 * You can lower this if it slows your machine too much.
 */
function simulateHeavyProcessing(todoId) {
  console.log(`[${WORKER_NAME}] Starting heavy processing for todo_id=${todoId}`);

  let total = 0;

  // Try 10 million iterations to make the work noticeable.
  // Change this to 10_000 if your assignment specifically wants that number.
  for (let i = 0; i < 10_000_000; i++) {
    total += Math.sqrt(i) * Math.sin(i);
  }

  console.log(`[${WORKER_NAME}] Finished heavy processing for todo_id=${todoId}`);

  return `Processed todo ${todoId}. Calculation result: ${total}`;
}

async function getNextJob() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      SELECT id, todo_id, job_type
      FROM job_queue
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;
      `
    );

    if (result.rows.length === 0) {
      await client.query("COMMIT");
      return null;
    }

    const job = result.rows[0];

    await client.query(
      `
      UPDATE job_queue
      SET status = 'processing',
          locked_by = $1,
          locked_at = CURRENT_TIMESTAMP,
          attempts = attempts + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
      `,
      [WORKER_NAME, job.id]
    );

    await client.query("COMMIT");

    return job;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`[${WORKER_NAME}] Error getting next job:`, error);
    return null;
  } finally {
    client.release();
  }
}

async function completeJob(jobId, resultText) {
  await pool.query(
    `
    UPDATE job_queue
    SET status = 'completed',
        result = $1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2;
    `,
    [resultText, jobId]
  );
}

async function failJob(jobId, errorMessage) {
  await pool.query(
    `
    UPDATE job_queue
    SET status = 'failed',
        result = $1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2;
    `,
    [errorMessage, jobId]
  );
}

async function processJobsForever() {
  console.log(`[${WORKER_NAME}] Worker started`);
  console.log(`[${WORKER_NAME}] Polling every ${POLL_INTERVAL_MS} ms`);

  await ensureTables();

  while (true) {
    const job = await getNextJob();

    if (!job) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    console.log(`[${WORKER_NAME}] Picked up job ${job.id}`);

    try {
      const resultText = simulateHeavyProcessing(job.todo_id);
      await completeJob(job.id, resultText);

      console.log(`[${WORKER_NAME}] Completed job ${job.id}`);
    } catch (error) {
      console.error(`[${WORKER_NAME}] Failed job ${job.id}:`, error);
      await failJob(job.id, error.message);
    }
  }
}

processJobsForever().catch((error) => {
  console.error(`[${WORKER_NAME}] Fatal worker error:`, error);
  process.exit(1);
});