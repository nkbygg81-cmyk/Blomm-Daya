# Blomm Daya

A React Native application built with Expo for connecting flower buyers with local florists.

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Blomm-Daya
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:

Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

Edit the `.env` file and replace `your_convex_url_here` with your actual Convex URL:
```env
EXPO_PUBLIC_CONVEX_URL=https://your-convex-project.convex.cloud
```

**Important:** The `.env` file should never be committed to git. It's already included in `.gitignore`.

### Running the Application

After setting up the environment variables, you can start the development server:

```bash
npm start
```

**Note:** After creating or modifying the `.env` file, you need to restart the Expo dev server for the changes to take effect.

### Running on Different Platforms

- **iOS:** `npm run ios`
- **Android:** `npm run android`
- **Web:** `npm run web`

### Running Tests

```bash
npm test
```

### Environment Variables

This project uses the following environment variables:

- `EXPO_PUBLIC_CONVEX_URL` - The URL for your Convex backend (required)

In Expo, environment variables must start with `EXPO_PUBLIC_` to be accessible in client-side code.

## Project Structure

- `/screens` - React Native screen components
- `/lib` - Utility functions and shared components
- `/convex` - Convex backend functions
- `/__tests__` - Test files

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Ensure all tests pass
4. Submit a pull request

## License

Private project - All rights reserved
