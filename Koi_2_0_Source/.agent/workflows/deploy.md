---
description: How to deploy the Koi Pond game (Manual Method)
---

Since Git is not installed on your system, the easiest way to deploy is using **Netlify Drop**.

## 🚀 Netlify Drop (Recommended)

This method requires no installation and takes less than 1 minute.

1.  **Locate the Build Folder**:
    -   Open your file explorer to: `c:\Users\최동준\Desktop\koi\dist`
    -   This folder contains your finished game files.

2.  **Upload to Netlify**:
    -   Go to [app.netlify.com/drop](https://app.netlify.com/drop).
    -   Drag and drop the **`dist` folder** into the "Drag and drop your site output folder here" area.
    -   Wait a few seconds, and your game will be live!

3.  **Share**:
    -   Netlify will give you a random URL (e.g., `peaceful-koi-123456.netlify.app`).
    -   You can share this link with anyone.

---

## Alternative: Vercel CLI (Advanced)

If you prefer Vercel, you would need to install their command line tool since Git is not available.

1.  Install Vercel CLI: `npm i -g vercel`
2.  Run deploy: `vercel`
3.  Follow the prompts.
