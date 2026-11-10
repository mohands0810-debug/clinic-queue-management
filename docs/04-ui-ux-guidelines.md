# UI/UX & Senior-Friendly Design System Guidelines

## Document Details
- **Project**: Digital Queue Management System
- **Clinic**: Dhanvantri Clinic (Dr Yogesh)
- **Institution**: K. S. Institute of Technology, Dept. of CSE (25BCP308)
- **Document Version**: 1.0.0

---

## 1. Design Philosophy: Senior-Friendly First

The demographic visiting Dhanvantri Clinic includes long-time residents of BTM Layout aged 60 to 80+ years who may experience age-related presbyopia, reduced motor precision, tremors, mild cognitive fatigue, or unfamiliarity with modern smartphone user interfaces.

### Core Tenets:
1. **One Primary Action Per Screen**: Eliminate multiple competing buttons. Every view guides the user toward a single, unmistakable primary decision.
2. **Generous Touch Geometry**: Minimum touch target height is **56px** (exceeding Apple's 44px and Android's 48px guidelines). Tap boundaries feature a minimum of 16px spacing.
3. **No Digital Roadblocks**: No CAPTCHAs, no mandatory app downloads, no account passwords, and zero OTP verification codes required to track a token.
4. **Resilient Forms**: Form inputs are never cleared upon validation errors or transient network dropouts.
5. **Multi-Sensory Feedback**: State changes are communicated across visual icons, text labels, high-contrast borders, haptic vibrations, and spoken synthetic voice.

---

## 2. Typography & Sizing Matrix

The typography hierarchy uses system-native clean sans-serif typefaces (`Inter`, `Noto Sans Kannada`, `Noto Sans Devanagari`).

| Level | Default Size | Scaled (`A+` Active) | Line Height | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Token Number** | `56px` (`3.5rem`) | `72px` (`4.5rem`) | 1.1 | Bold (700) | Current token badge on Status & TV Board |
| **Heading 1** | `32px` (`2.0rem`) | `40px` (`2.5rem`) | 1.25 | Bold (700) | Screen titles, Status alerts |
| **Heading 2** | `26px` (`1.625rem`)| `32px` (`2.0rem`) | 1.3 | SemiBold (600) | Section titles, Patient initials |
| **Body (Base)** | `20px` (`1.25rem`) | `26px` (`1.625rem`)| 1.5 | Regular (400) | Explanatory sentences, Arrival times |
| **Button Text** | `22px` (`1.375rem`)| `28px` (`1.75rem`) | 1.2 | Bold (700) | Primary CTA labels |
| **Subtext/Meta** | `18px` (`1.125rem`)| `22px` (`1.375rem`)| 1.4 | Medium (500) | Secondary badges, Helper instructions |

*Note: The font scale toggle (`A-` / `A+`) is sticky in the top header and preserves the user's preference in localStorage.*

---

## 3. Color Palettes & Contrast Ratios

### 3.1 Default Calm Clinical Palette (WCAG AA Certified)
- **Primary Brand / Action**: Medical Deep Blue (`#0F4C81`) on White (`#FFFFFF`) — **Contrast 8.5:1** (Exceeds AAA).
- **Secondary / Surface**: Soft Slate (`#F8FAFC`) with Charcoal Ink (`#0F172A`) — **Contrast 14.8:1**.
- **Active / Turn Ready**: Emerald Green (`#047857`) on Mint Surface (`#ECFDF5`) — **Contrast 5.2:1**.
- **Warning / Delay**: Amber Ochre (`#B45309`) on Warm Sand (`#FEF3C7`) — **Contrast 4.9:1**.
- **Distress / Missed**: Crimson Red (`#B91C1C`) on Rose Tint (`#FFE4E6`) — **Contrast 6.8:1**.

### 3.2 High-Contrast Mode (WCAG AAA Certified, 1-Tap Toggle)
- **Background**: Absolute Deep Black (`#000000`).
- **Foreground / Text**: Crisp Brilliant White (`#FFFFFF`) — **Contrast 21:1**.
- **Primary Action**: Electric Amber (`#FFD700`) with Black Text (`#000000`) — **Contrast 16.5:1**.
- **Active State / Token**: Electric Lime (`#00FF66`) on Black (`#000000`) — **Contrast 14.1:1**.
- **Borders & Dividers**: Solid 3px high-contrast borders on all interactive containers.

---

## 4. Multilingual & Audio Architecture

### 4.1 Native Language Selection
The first interactive screen prompts language selection using the native script for each language:
- **English**
- **ಕನ್ನಡ (Kannada)**
- **हिन्दी (Hindi)**

The selection is persisted. All system notifications, buttons, and speech outputs immediately adopt the chosen language.

### 4.2 Spoken Readout ("🔊 Read this to me")
Every patient screen includes an accessible floating audio button. When activated:
- Browser `window.speechSynthesis` retrieves an appropriate localized voice (`kn-IN`, `hi-IN`, or `en-IN`).
- In Kannada, the engine vocalizes:
  - Token screen: *"ನಿಮ್ಮ ಟೋಕನ್ ಸಂಖ್ಯೆ 14. ನಿಮ್ಮ ಮುಂದೆ 3 ರೋಗಿಗಳಿದ್ದಾರೆ. ಅಂದಾಜು ಕಾಯುವ ಸಮಯ 25 ನಿಮಿಷಗಳು."*
- If the patient has indicated hearing impairment, the audio button shifts to a visual vibration and screen flash confirmation.

---

## 5. Screen Wireframes & UI Flow

### 5.1 Patient Home (`/`)
```
+-------------------------------------------------------------+
| [A- / A+]  [Contrast Toggle]            [Language: ಕನ್ನಡ v]  |
| Dhanvantri Clinic (Dr Yogesh)                               |
| Sandhya Theater Complex, BTM Layout                         |
+-------------------------------------------------------------+
|                                                             |
|  DOCTOR STATUS: ● Available (9:30 AM - 1:30 PM)             |
|                                                             |
|  +-------------------------------------------------------+  |
|  |                 NOW SERVING: TOKEN #12                |  |
|  |             Average Wait: ~8 mins/patient             |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +-------------------------------------------------------+  |
|  |                                                       |  |
|  |               [ GET MY TOKEN ]                        |  |
|  |       (ನನ್ನ ಟೋಕನ್ ಪಡೆಯಿರಿ - Big 64px Button)           |  |
|  |                                                       |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +-------------------------------------------------------+  |
|  |               [ Check My Existing Token ]             |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  [📞 Call Clinic: 9876543210]         [ 🚨 I Need Help ]   |
+-------------------------------------------------------------+
```

### 5.2 Token Creation Flow (`/get-token`)
A 3-step streamlined linear process:
- **Step 1: Patient Identity**: Full Name (with optional microphone voice input) and Mobile Phone. Toggle: *"No phone? Click here to register at desk"*.
- **Step 2: Accessibility Profile**:
  - `[ ] I am 60 years or older (Senior Care Priority)`
  - `[ ] Wheelchair / Walker assistance`
  - `[ ] Hearing impairment (Enable flash alerts & vibration)`
- **Step 3: Confirmation & Consent**:
  - Clear summary: Name, Age, Phone. Short data consent statement. Big green action button: **[ Confirm & Join Queue ]**.

### 5.3 Live Token Status Screen (`/status?id=...`)
```
+-------------------------------------------------------------+
| [A- / A+]  [Contrast]                    [Language: ಕನ್ನಡ v] |
+-------------------------------------------------------------+
| YOUR TOKEN NUMBER:                                          |
|                                                             |
|                    # 14                                     |
|                                                             |
| STATUS: Waiting (ಕಾಯುತ್ತಿದ್ದೀರಿ)                              |
| Patients ahead of you: 3                                    |
| Estimated Wait: About 25 mins (could be 20–35 mins)         |
| Suggested Arrival: Please reach clinic by 11:20 AM          |
+-------------------------------------------------------------+
|                                                             |
| [ 🔊 Read this to me ]                                      |
|                                                             |
| [ 📍 I Have Reached the Clinic ]                            |
|                                                             |
| [ 📤 Share Live Status on WhatsApp (Family Proxy) ]         |
|                                                             |
| [ ❌ Leave Queue ]                     [ 🚨 I Need Help ]   |
+-------------------------------------------------------------+
```

### 5.4 Waiting-Room TV Board (`/display`)
- Optimized for horizontal 16:9 ratio.
- Left column (60% width): **CURRENTLY SERVING TOKEN #** in 120px font, patient initials, and doctor delay banner if applicable.
- Right column (40% width):
  - Upcoming Queue list (Tokens #15, #16, #17, #18, #19).
  - High-resolution QR code: *"Scan to Join Queue"*.
  - Clock with clinic operational hours.

### 5.5 Doctor Console (`/doctor`)
- **Queue Tab**:
  - Big Active Patient Card: Token #, Full Name, Phone, Age, Badges (`Senior`, `Wheelchair`).
  - Action Controls: `[ Call Next ]`, `[ Start ]`, `[ Complete ]`, `[ Hold Turn ]`, `[ Mark Missed ]`.
  - Walk-In Quick Form: One-click print slip for desk arrivals.
  - Active Queue Table: Draggable list with priority indicators and delay broadcast bar.
- **Reports Tab**:
  - Wait duration histogram, peak hourly traffic graph, no-show rate meter, CSV/PDF export.
- **Settings Tab**:
  - Consultation target duration, senior interleaving ratio, clinic hours, and simulation mode switch.
