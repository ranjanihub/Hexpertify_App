import { connectToDatabase } from '../db/mongodb';

async function run() {
  const db = await connectToDatabase();
  await db.collection('Activity').updateMany(
    {}, 
    { 
      $set: { clientAssignments: [], assignedTo: [] },
      $unset: { assignedClientName: "", assignedClientEmail: "", assignedInfo: "" }
    }
  );
  await db.collection('activities').updateMany(
    {}, 
    { 
      $set: { clientAssignments: [], assignedTo: [] },
      $unset: { assignedClientName: "", assignedClientEmail: "", assignedInfo: "" }
    }
  ).catch(() => {});

  console.log('Successfully cleared mock activity assignments!');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
