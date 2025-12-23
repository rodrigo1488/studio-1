# Calls Server Migration TODO

The signaling logic has been extracted to the `calls/` directory.

## Backend (Calls Server)
1.  **Deploy**: Deploy the content of the `calls/` folder to a separate Vercel project (or any Node.js hosting).
    -   Note: Vercel Serverless Functions have generic timeouts. For WebSockets, you might need a custom server provider (like Railway, Fly.io, or Heroku) or use Vercel with a generic Node.js setup if supported. **Recommendation: Use Railway or Fly.io for WebSocket servers.**
2.  **Install Dependencies**: Run `npm install` inside the `calls` folder.
3.  **Run**: Start the server with `npm run dev` (locally on port 3001) or `npm start`.

## Frontend (Main Application)
1.  **Environment Variable**: Update your `.env` file in the main application:
    ```
    NEXT_PUBLIC_WS_URL=wss://your-calls-app-url.com
    # Or locally:
    NEXT_PUBLIC_WS_URL=ws://localhost:3001
    ```
2.  **Verify Integration**: storage
    -   Ensure `CallContext` connects to `NEXT_PUBLIC_WS_URL`.
    -   Test audio/video calls to ensure signaling works.

## Cleanup
-   The `calls/` folder is ignored by git in the main repo (`.gitignore`).
-   You should initialize a new git repository inside `calls/` if you want to version it separately.
