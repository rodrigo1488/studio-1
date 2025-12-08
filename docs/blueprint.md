# **App Name**: FamilyChat: Secure Connect

## Core Features:

- Secure Room Creation: Users can create private rooms and invite family members using a unique code.
- Real-Time Chat: Send text, image, video, and audio messages within secure rooms.
- Media Uploads: Upload and share media files securely using Firebase Storage.
- User Authentication: Secure login and registration system with email/password, storing user data (name, profile picture, creation date) in Firestore.
- Firestore Integration: Utilize Firestore for real-time updates and data storage, including user profiles, room details, and messages.
- Room Access Control: Implement Firestore rules to ensure users can only access rooms where they are members, and only members can send messages.
- Media Security: Apply Storage rules to limit media file sizes and types for enhanced security.

## Style Guidelines:

- Primary color: Dark blue (#2C3E50) to convey trust and security.
- Background color: Light blue (#E0EBF5) for a calm and modern feel.
- Accent color: Soft lilac (#C8A2C8) to add a touch of tranquility and contrast, especially in highlights.
- Body and headline font: 'Inter', a grotesque sans-serif for a modern, objective look, suitable for headlines and body text.
- Simple outline icons to maintain a minimalist design.
- Mobile-first design with a clean, fixed header, smooth input borders, and rounded corners.
- Subtle animations for visual feedback, such as loading indicators or message confirmations.