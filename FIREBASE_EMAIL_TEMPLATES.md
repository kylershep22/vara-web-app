# Firebase Email Templates Configuration

This guide explains how to customize Firebase Authentication email templates to be on-brand for Vara.

## Overview

Firebase sends emails for:
- **Email verification** - When users sign up
- **Password reset** - When users request to reset their password
- **Email change** - When users change their email address

## Step 1: Configure Custom Action URL

First, configure Firebase to use your custom landing page instead of the default Firebase action handler.

### In Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **vara-4a99f**
3. Navigate to **Authentication** → **Templates**
4. For each template type, click **Edit template**
5. Click **Customize action URL**
6. Enter: `https://vara-4a99f.web.app/auth/action`

This ensures users land on your polished `/auth/action` page instead of the generic Firebase page.

## Step 2: Customize Email Templates

Firebase Console allows you to customize the subject line and body of each email template.

### Password Reset Email

**Subject:** `Reset your Vara password`

**Body (HTML):**
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAFAF6;">

  <!-- Logo Header -->
  <div style="text-align: center; margin-bottom: 32px;">
    <img src="https://vara-4a99f.web.app/images/vara-logo-email.png" alt="Vara" width="64" height="64" style="border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
  </div>

  <!-- Main Content -->
  <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">

    <h1 style="color: #1B5E57; font-size: 24px; font-weight: 600; margin: 0 0 8px; text-align: center;">
      Reset Your Password
    </h1>

    <p style="color: #6B7B6A; font-size: 14px; font-style: italic; text-align: center; margin: 0 0 24px;">
      "Every journey back to wellness starts with a single step."
    </p>

    <p style="color: #3E3E3E; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
      Hi there,
    </p>

    <p style="color: #3E3E3E; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
      We received a request to reset your password for your Vara account associated with <strong>%EMAIL%</strong>.
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="%LINK%" style="display: inline-block; background: linear-gradient(135deg, #F4C542 0%, #F5B971 100%); color: white; font-weight: 600; font-size: 16px; padding: 16px 48px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(244, 197, 66, 0.3);">
        Reset Password
      </a>
    </div>

    <p style="color: #6B7B6A; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
      This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>

    <hr style="border: none; border-top: 1px solid #D5E3D1; margin: 24px 0;">

    <p style="color: #9AAE8C; font-size: 12px; line-height: 1.5; margin: 0;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="%LINK%" style="color: #1B5E57; word-break: break-all;">%LINK%</a>
    </p>

  </div>

  <!-- Footer -->
  <div style="text-align: center; margin-top: 32px;">
    <p style="color: #9AAE8C; font-size: 12px; margin: 0 0 8px;">
      Vara - Your Personal Wellness Companion
    </p>
    <p style="color: #9AAE8C; font-size: 12px; margin: 0;">
      <a href="https://vara-4a99f.web.app/privacy" style="color: #1B5E57;">Privacy Policy</a> ·
      <a href="https://vara-4a99f.web.app/terms" style="color: #1B5E57;">Terms of Service</a>
    </p>
  </div>

</div>
```

### Email Verification Email

**Subject:** `Verify your Vara email`

**Body (HTML):**
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAFAF6;">

  <!-- Logo Header -->
  <div style="text-align: center; margin-bottom: 32px;">
    <img src="https://vara-4a99f.web.app/images/vara-logo-email.png" alt="Vara" width="64" height="64" style="border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
  </div>

  <!-- Main Content -->
  <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">

    <h1 style="color: #1B5E57; font-size: 24px; font-weight: 600; margin: 0 0 8px; text-align: center;">
      Welcome to Vara! 🌱
    </h1>

    <p style="color: #6B7B6A; font-size: 14px; font-style: italic; text-align: center; margin: 0 0 24px;">
      "Growth begins with the courage to start."
    </p>

    <p style="color: #3E3E3E; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
      Hi there,
    </p>

    <p style="color: #3E3E3E; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
      Thanks for signing up for Vara! Please verify your email address to complete your account setup and start your wellness journey.
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="%LINK%" style="display: inline-block; background: linear-gradient(135deg, #F4C542 0%, #F5B971 100%); color: white; font-weight: 600; font-size: 16px; padding: 16px 48px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(244, 197, 66, 0.3);">
        Verify Email Address
      </a>
    </div>

    <p style="color: #6B7B6A; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
      This link will expire in 24 hours. If you didn't create a Vara account, you can safely ignore this email.
    </p>

    <hr style="border: none; border-top: 1px solid #D5E3D1; margin: 24px 0;">

    <p style="color: #9AAE8C; font-size: 12px; line-height: 1.5; margin: 0;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="%LINK%" style="color: #1B5E57; word-break: break-all;">%LINK%</a>
    </p>

  </div>

  <!-- Footer -->
  <div style="text-align: center; margin-top: 32px;">
    <p style="color: #9AAE8C; font-size: 12px; margin: 0 0 8px;">
      Vara - Your Personal Wellness Companion
    </p>
    <p style="color: #9AAE8C; font-size: 12px; margin: 0;">
      <a href="https://vara-4a99f.web.app/privacy" style="color: #1B5E57;">Privacy Policy</a> ·
      <a href="https://vara-4a99f.web.app/terms" style="color: #1B5E57;">Terms of Service</a>
    </p>
  </div>

</div>
```

### Email Change Verification

**Subject:** `Confirm your new Vara email`

**Body (HTML):**
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAFAF6;">

  <!-- Logo Header -->
  <div style="text-align: center; margin-bottom: 32px;">
    <img src="https://vara-4a99f.web.app/images/vara-logo-email.png" alt="Vara" width="64" height="64" style="border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
  </div>

  <!-- Main Content -->
  <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">

    <h1 style="color: #1B5E57; font-size: 24px; font-weight: 600; margin: 0 0 8px; text-align: center;">
      Confirm Email Change
    </h1>

    <p style="color: #6B7B6A; font-size: 14px; font-style: italic; text-align: center; margin: 0 0 24px;">
      "Each mindful breath is a step forward."
    </p>

    <p style="color: #3E3E3E; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
      Hi there,
    </p>

    <p style="color: #3E3E3E; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
      We received a request to change your Vara account email to <strong>%EMAIL%</strong>. Click the button below to confirm this change.
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="%LINK%" style="display: inline-block; background: linear-gradient(135deg, #F4C542 0%, #F5B971 100%); color: white; font-weight: 600; font-size: 16px; padding: 16px 48px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(244, 197, 66, 0.3);">
        Confirm Email Change
      </a>
    </div>

    <p style="color: #6B7B6A; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
      If you didn't request this change, please contact support immediately.
    </p>

    <hr style="border: none; border-top: 1px solid #D5E3D1; margin: 24px 0;">

    <p style="color: #9AAE8C; font-size: 12px; line-height: 1.5; margin: 0;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="%LINK%" style="color: #1B5E57; word-break: break-all;">%LINK%</a>
    </p>

  </div>

  <!-- Footer -->
  <div style="text-align: center; margin-top: 32px;">
    <p style="color: #9AAE8C; font-size: 12px; margin: 0 0 8px;">
      Vara - Your Personal Wellness Companion
    </p>
    <p style="color: #9AAE8C; font-size: 12px; margin: 0;">
      <a href="https://vara-4a99f.web.app/privacy" style="color: #1B5E57;">Privacy Policy</a> ·
      <a href="https://vara-4a99f.web.app/terms" style="color: #1B5E57;">Terms of Service</a>
    </p>
  </div>

</div>
```

## Step 3: Add Logo Image for Emails

Create/copy the logo image to be accessible from the web:

```bash
# Copy the logo to public/images for email use
cp src/assets/logo/vara-logo-hr.png public/images/vara-logo-email.png
```

Then deploy to make it accessible:
```bash
npm run build && firebase deploy --only hosting
```

## Step 4: Configure Sender Name

In Firebase Console → Authentication → Templates:

1. Click on the **gear icon** (settings) in the email templates section
2. Set the **Sender name** to: `Vara Wellness`

## Email Delivery Speed

Firebase uses its own email infrastructure. To improve delivery speed:

1. **Verify your domain** (optional but recommended):
   - Go to Authentication → Settings → Authorized domains
   - Add your custom domain if you have one

2. **Use Firebase Extensions** (for advanced customization):
   - Consider the "Trigger Email" extension for more control
   - Allows using SendGrid, Mailgun, etc. for faster delivery

## Testing

After configuring:

1. Test password reset:
   ```
   1. Go to your app's login page
   2. Click "Forgot Password"
   3. Enter a test email
   4. Check email (including spam folder)
   5. Click the button - should go to /auth/action
   ```

2. Test email verification:
   ```
   1. Sign up with a new account
   2. Check email for verification
   3. Click the button
   4. Should see success page
   ```

## Color Reference

| Color | Hex | Usage |
|-------|-----|-------|
| Evergreen Teal | `#1B5E57` | Headers, links |
| Sunrise Amber | `#F4C542` | Button gradient start |
| Golden Apricot | `#F5B971` | Button gradient end |
| Mist White | `#FAFAF6` | Background |
| Soft Charcoal | `#3E3E3E` | Body text |
| Silver Sage | `#6B7B6A` | Muted text |
| Dew Sage | `#D5E3D1` | Borders |
| Olive Sage | `#9AAE8C` | Footer text |

## Troubleshooting

### Emails going to spam
- Use a custom domain with proper SPF/DKIM records
- Avoid spam trigger words
- Keep image-to-text ratio reasonable

### Links not working
- Ensure the action URL is correctly configured in Firebase Console
- Check that your app handles the `/auth/action` route
- Verify the app is deployed with the latest build

### Slow delivery
- Firebase's email service can have delays during high traffic
- Consider using a third-party email service via Firebase Extensions
