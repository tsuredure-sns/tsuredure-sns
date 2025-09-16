
# Client Flow

## 1. Inspect or generate user identity

Unlike typical services that fetch or register user data on a centralized server (storing passwords, emails, etc.), Tsuredure SNS lets users manage their own identity. If user identity is not stored in the browser, it is generated locally.

1. Check whether user identity is stored in the browser's OPFS (Origin Private File System).
2. If not present, generate a new user identity:
   - Generate a key pair (public/private keys).
   - Enter username and profile information.
3. Save the generated identity to OPFS.
4. If present, load the identity from OPFS.

## 2. Connect to the signaling server

To establish P2P communication, connect to a signaling server. The signaling server mediates peer connection information (SDP, ICE candidates).

By default, the signaling server runs on Cloudflare Workers, but users may specify an arbitrary signaling server.

1. Obtain the signaling server URL.
2. Connect to the signaling server via WebSocket.
3. Once connected, send user information (public key, username, etc.) to the signaling server.
4. Register your peer connection information with the signaling server.
5. Receive information about other peers from the signaling server.

## 3. Establish peer connections

Based on information received from the signaling server, establish P2P connections using WebRTC.

1. Parse peer information received from the signaling server.
2. Create an `RTCPeerConnection`.
3. Create a `DataChannel`.
4. Exchange SDP offers/answers.
5. Exchange ICE candidates.
6. Once connected, send and receive messages over the `DataChannel`.

## 4. Create and sign posts

Users create posts and sign them with their private keys. Signed posts are saved to OPFS and distributed to other peers over the P2P network.

1. Enter post content.
2. Add a timestamp to the post.
3. Generate a unique ID for the post.
4. Sign the post content with the private key.
5. Save the signed post to OPFS.
6. Send the signed post to other peers over the P2P network.

## 5. Receive and verify posts

Incoming posts from other peers are verified by signature and, if valid, saved to OPFS.

1. Receive a post from a peer.
2. Verify the post's signature with the author's public key.
3. If the signature is valid, save the post to OPFS.
4. If the signature is invalid, show a warning.
5. Display saved posts in the UI.

## 6. Display timeline

Load saved posts from OPFS and display them as a timeline.

Additional sample features for the timeline are listed below.

1. Load saved posts from OPFS.
2. Sort posts by timestamp.
3. Render posts in the UI.
4. Update the timeline when new posts are saved.
5. Allow users to view other users' profiles.
6. Allow filtering by tags or keywords.
7. Allow replies and reactions to posts.
8. Sync posts received while offline when the client next goes online.
9. Provide search to find past posts easily.
10. Allow users to edit or delete their posts.
11. Provide a pin feature to keep important posts at the top of timelines.
12. Provide import/export features for sharing posts between devices or services.
13. Provide backup features so users can periodically save their posts.
14. Provide push notifications via PWA for new posts or replies.
15. Provide translation features so users can understand posts in other languages.
16. Allow media attachments (images, videos) in posts.
17. Provide reaction features such as likes or reposts.
18. Provide thread views so replies and related posts are easy to follow.
19. Provide archive features to organize older posts.
20. Provide categorization to organize posts by theme.
21. Provide reporting features for inappropriate posts.
22. Provide moderation features to manage comments on a user's posts.
23. Provide analytics so users can see views and reactions to their posts.
24. Provide custom filters so users can tailor their timelines.
25. Provide offline viewing for saved posts without a network connection.
26. Provide sync across multiple devices.
27. Provide notification settings to customize alerts from specific posts or users.
28. Provide theme settings to change timeline appearance.
29. Provide shortcuts for frequently used actions.
30. Provide help content for posting-related questions and issues.
31. Provide feedback features so users can send improvement suggestions.
32. Provide community features to interact with other users.
33. Provide event features to collect and display event-related posts.
34. Provide calendar features to browse posts by date.
35. Provide multi-account support to switch between accounts.
36. Provide security features to protect a user's post data.
