import { supabase } from '../lib/supabase';

async function exploreDatabase() {
  console.log('Exploring Supabase Database...');
  
  // Get all tables in the public schema
  const { data: tables, error: tablesError } = await supabase
    .from('pg_tables')
    .select('tablename')
    .eq('schemaname', 'public');
  
  if (tablesError) {
    console.error('Error fetching tables:', tablesError);
    return;
  }
  
  console.log('Tables in your database:');
  console.log(tables);
  
  // For each table, get some sample data
  for (const table of tables) {
    const tableName = table.tablename;
    console.log(`\n--- Data from table: ${tableName} ---`);
    
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (error) {
      console.error(`Error fetching data from ${tableName}:`, error);
      continue;
    }
    
    console.log(`Total records: ${count}`);
    console.log('Sample data:');
    console.log(data);
  }
}

// Run the function
exploreDatabase()
  .then(() => console.log('Database exploration complete'))
  .catch(err => console.error('Error exploring database:', err));
