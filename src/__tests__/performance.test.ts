import 'dotenv/config';
import { performance } from 'perf_hooks';

// Skip entire suite when Supabase credentials are not available
const hasEnvVars = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY;
const describeOrSkip = hasEnvVars ? describe : describe.skip;

describeOrSkip('Performance Tests (requires Supabase credentials)', () => {
    let client: any;
    const testEmail = process.env.SUPABASE_TEST_EMAIL;
    const testPassword = process.env.SUPABASE_TEST_PASSWORD;
    let userId: string = "";

    beforeAll(async () => {
        // Import and initialize inside beforeAll so it only runs when not skipped
        const { createClient } = require('@supabase/supabase-js');
        client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

        const { data, error } = await client.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
        });

        if (error || !data.session) {
            throw new Error(`Failed to authenticate test user: ${error?.message}`);
        }

        userId = data.user.id;
        console.log(`Authenticated test user: ${userId}`);
    });

    afterAll(async () => {
        if (client) {
            await client.auth.signOut();
            console.log("Test user signed out.");
        }
    });

    test("Check Supabase connection", async () => {
        const { data, error } = await client
            .from('articles')
            .select('*')
            .limit(1);

        expect(error).toBeNull();
        expect(data).toBeDefined();
    });
});
