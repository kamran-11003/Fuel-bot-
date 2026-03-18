# WhatsApp Fuel Complaint System — Message Flow Design

> **Version:** 3.0  
> **Date:** 18 March 2026  
> **Status:** ✅ Approved & Implemented  
> **Languages Supported:** English (EN) | Urdu (UR)

---

## FSM State Overview

| # | State | Input Type | Required |
|---|-------|-----------|---------|
| 1 | `LANGUAGE_SELECTION` | Button tap | ✅ Yes |
| 2 | `GREETING` | Button tap | ✅ Yes |
| 3 | `CNIC_INPUT` | Free text | ✅ Yes |
| 4 | `PROVINCE_SELECTION` | List selection | ✅ Yes |
| 5 | `COMPLAINT_TYPE` | List selection | ✅ Yes |
| 6 | `DETAILS_INPUT` | Free text | ✅ Yes (min 20 chars) |
| 7 | `PUMP_NAME` | List selection | ✅ Yes |
| 8 | `LOCATION_INPUT` | GPS pin only | ✅ Yes |
| 9 | `LANDMARK_INPUT` | Free text | ✅ Yes |
| 10 | `IMAGE_UPLOAD` | Image or Skip | ❌ Optional |
| 11 | `REVIEW` | Button tap | ✅ Yes |
| 11a | `EDIT_SELECT` | List selection | 🔁 If editing |
| 12 | `CONFIRMATION` | — | — |

> **DETAILS_INPUT Rule:** Compulsory for **all** complaint types. Minimum **20 characters**.

---

## Complete Message Flow

---

### 🟣 State 1: LANGUAGE_SELECTION

**Trigger:** Any first message or session restart.  
**Bot sends → Interactive Buttons (2 buttons)**

```
Please select your language / اپنی زبان منتخب کریں:

[ English ]   [ اردو ]
```

| User Action | Next State |
|---|---|
| Taps `English` | → GREETING (EN) |
| Taps `اردو` | → GREETING (UR) |
| Any other input | Resend language prompt |

---

### 🟣 State 2: GREETING

**Bot sends (EN) → Interactive Button (1 button)**

```
👋 Welcome to the Fuel Complaint System!

This service allows you to report fuel-related 
complaints at petrol pumps across Pakistan.

Would you like to file a complaint?

[ Start 🚀 ]
```

**Bot sends (UR) → Interactive Button (1 button)**

```
👋 فیول شکایت سسٹم میں خوش آمدید!

یہ سروس آپ کو پاکستان بھر کے پیٹرول پمپس پر 
فیول سے متعلق شکایات درج کرنے کی سہولت دیتی ہے۔

کیا آپ شکایت درج کرنا چاہتے ہیں؟

[ شروع کریں 🚀 ]
```

| User Action | Next State |
|---|---|
| Taps `Start 🚀` / `شروع کریں 🚀` | → CNIC_INPUT |

---

### 🟣 State 3: CNIC_INPUT

**Bot sends (EN) → Text message**

```
🪪 Please enter your 13-digit CNIC (without dashes):

Example: 3520212345679
```

**Bot sends (UR) → Text message**

```
🪪 براہ کرم اپنا 13 ہندسوں کا قومی شناختی کارڈ نمبر درج کریں (بغیر ڈیش کے):

مثال: 3520212345679
```

**User types:** `3520212345679`

**Validations:**

| Condition | Bot Response (EN) | Bot Response (UR) |
|---|---|---|
| Not 13 digits or non-numeric | ⚠️ Invalid CNIC. Please enter a valid 13-digit number without dashes. | ⚠️ غلط CNIC۔ براہ کرم 13 ہندسوں کا درست نمبر درج کریں۔ |
| Same CNIC submitted complaint in last 24 hrs | ⏳ You have already submitted a complaint in the last 24 hours. Please try again after 24 hours. | ⏳ آپ پچھلے 24 گھنٹوں میں پہلے ہی شکایت درج کر چکے ہیں۔ براہ کرم 24 گھنٹے بعد دوبارہ کوشش کریں۔ |
| Valid CNIC, no cooldown | → PROVINCE_SELECTION | → PROVINCE_SELECTION |

---

### 🟣 State 4: PROVINCE_SELECTION

**Bot sends (EN) → Interactive List**

```
🗺️ Select your Province / Region:

[ Select Province ▾ ]
─────────────────────
  • Punjab
  • Sindh
  • Khyber Pakhtunkhwa (KPK)
  • Balochistan
  • Islamabad (ICT)
```

**Bot sends (UR) → Interactive List**

```
🗺️ اپنا صوبہ / خطہ منتخب کریں:

[ صوبہ منتخب کریں ▾ ]
─────────────────────
  • پنجاب
  • سندھ
  • خیبر پختونخوا (KPK)
  • بلوچستان
  • اسلام آباد (ICT)
```

| User Selects | Next State |
|---|---|
| Any province | → COMPLAINT_TYPE |

---

### 🟣 State 5: COMPLAINT_TYPE

**Bot sends (EN) → Interactive List**

```
📋 What is the nature of your complaint?

[ Select Complaint Type ▾ ]
────────────────────────────
  • Short Measurement (کم تول)
  • Fuel Quality Issue
  • Overcharging / Wrong Rate
  • Pump Refused to Serve
  • Other
```

**Bot sends (UR) → Interactive List**

```
📋 آپ کی شکایت کی نوعیت کیا ہے؟

[ شکایت کی قسم منتخب کریں ▾ ]
────────────────────────────
  • کم تول (Short Measurement)
  • ایندھن کا معیار خراب
  • زیادہ قیمت / غلط ریٹ
  • پمپ نے سروس دینے سے انکار
  • دیگر
```

| User Selects | Next State |
|---|---|
| Any complaint type | → DETAILS_INPUT |

---

### 🟣 State 6: DETAILS_INPUT

> **Rule:** Compulsory for **all** complaint types. Minimum **20 characters**. No skip option.

**Bot sends (EN) → Text message**

```
✍️ Please describe your complaint in detail
(minimum 20 characters):
```

**Bot sends (UR) → Text message**

```
✍️ براہ کرم اپنی شکایت تفصیل سے بیان کریں
(کم از کم 20 حروف):
```

| User Action | Bot Response | Next State |
|---|---|---|
| Sends text ≥ 20 chars | *(moves silently)* | → PUMP_NAME |
| Sends text < 20 chars | ⚠️ Details too short. Please provide at least 20 characters. / ⚠️ تفصیلات بہت مختصر ہیں۔ کم از کم 20 حروف درج کریں۔ | Stays in DETAILS_INPUT |
| Sends non-text | *(re-prompts)* | Stays in DETAILS_INPUT |

---

### 🟣 State 7: PUMP_NAME

**Bot sends (EN) → Interactive List**

```
⛽ Select the Petrol Pump Company:

[ Select Pump ▾ ]
──────────────────────────────────
  • PSO (Pakistan State Oil)
  • Shell Pakistan
  • Total PARCO
  • APL (Attock Petroleum)
  • Cnergyico (formerly Byco)
  • GO (Gas & Oil Pakistan)
  • Aramco
  • Hascol
  • Puma Energy
  • Flow Petroleum
```

**Bot sends (UR) → Interactive List**

```
⛽ پیٹرول پمپ کمپنی منتخب کریں:

[ پمپ منتخب کریں ▾ ]
──────────────────────────────────
  • PSO (پاکستان اسٹیٹ آئل)
  • Shell Pakistan
  • Total PARCO
  • APL (اٹاک پیٹرولیم)
  • Cnergyico (سابقہ Byco)
  • GO (گیس اینڈ آئل پاکستان)
  • Aramco
  • Hascol
  • Puma Energy
  • Flow Petroleum
```

| User Selects | Next State |
|---|---|
| Any pump | → LOCATION_INPUT |

---

### 🟣 State 8: LOCATION_INPUT

> **Rule:** GPS pin **only**. Text addresses are **not** accepted.

**Bot sends (EN) → Text message**

```
📍 Please share the GPS location of the petrol pump:

📌 Tap the attachment icon (📎) → Location to share your live GPS pin.

⚠️ Only GPS location is accepted — text addresses are not supported.
```

**Bot sends (UR) → Text message**

```
📍 پیٹرول پمپ کی GPS لوکیشن شیئر کریں:

📌 اٹیچمنٹ آئیکن (📎) دبائیں → Location منتخب کریں۔

⚠️ صرف GPS لوکیشن قبول کی جائے گی — متنی پتہ درج نہ کریں۔
```

| User Action | Bot Response | Next State |
|---|---|---|
| Sends GPS pin | ✅ GPS location received. Thank you! / ✅ GPS لوکیشن موصول ہو گئی۔ شکریہ! | → LANDMARK_INPUT |
| Sends text or anything else | ⚠️ Please share a GPS location using the attachment icon. / ⚠️ براہ کرم GPS لوکیشن شیئر کریں۔ | Stays in LOCATION_INPUT |

---

### 🟣 State 9: LANDMARK_INPUT

> **Rule:** Compulsory. Minimum 3 characters of free text.

**Bot sends (EN) → Text message**

```
🏫 Please enter the nearest landmark to the petrol pump:

Example: Near City Hospital, opposite Jinnah Park, next to KFC
```

**Bot sends (UR) → Text message**

```
🏫 پیٹرول پمپ کے قریب کوئی مشہور نشانی بتائیں:

مثال: سٹی ہسپتال کے قریب، جناح پارک کے سامنے، KFC کے ساتھ
```

| User Action | Bot Response | Next State |
|---|---|---|
| Sends text ≥ 3 chars | ✅ Landmark noted! / ✅ نشانی نوٹ کر لی گئی! | → IMAGE_UPLOAD |
| Sends text < 3 chars or non-text | ⚠️ Landmark is required. Please type a recognisable nearby landmark. / ⚠️ قریبی نشانی ضروری ہے۔ | Stays in LANDMARK_INPUT |

---

### 🟣 State 10: IMAGE_UPLOAD

**Bot sends (EN) → Interactive Button (1 button)**

```
📸 Do you have photo evidence?
(e.g. meter reading, receipt, pump display)

Please send an image, or skip.

[ Skip ⏭️ ]
```

**Bot sends (UR) → Interactive Button (1 button)**

```
📸 کیا آپ کے پاس تصویری ثبوت ہے؟
(مثلاً میٹر ریڈنگ، رسید، پمپ ڈسپلے)

براہ کرم تصویر بھیجیں، یا چھوڑ دیں۔

[ چھوڑیں ⏭️ ]
```

| User Action | Bot Response | Next State |
|---|---|---|
| Sends image | ✅ Image received! / ✅ تصویر موصول ہو گئی! | → REVIEW |
| Taps `Skip` / `چھوڑیں` | *(no response, moves silently)* | → REVIEW |
| Sends non-image file | ⚠️ Please send an image file only. / ⚠️ براہ کرم صرف تصویر بھیجیں۔ | Stays in IMAGE_UPLOAD |

---

### 🟣 State 11: REVIEW

**Bot sends (EN) → Interactive Buttons (2 buttons)**

```
📋 *Complaint Review*

🪪 CNIC:           352021•••679
🗺️ Province:       Punjab
📝 Type:            Short Measurement
✍️ Details:        Meter was showing 1L but only
                   0.7L fuel dispensed.
⛽ Pump:            PSO (Pakistan State Oil)
📍 Location:       📌 GPS Location Attached
🏫 Landmark:       Near City Hospital, Blue Area
📸 Image:           ✅ Attached

──────────────────────────────
Please review your complaint before submitting.

[ ✅ Submit ]   [ ✏️ Edit ]
```

**Bot sends (UR) → Interactive Buttons (2 buttons)**

```
📋 *شکایت کا جائزہ*

🪪 CNIC:           352021•••679
🗺️ صوبہ:           پنجاب
📝 قسم:             کم تول
✍️ تفصیلات:        میٹر 1 لیٹر دکھا رہا تھا لیکن
                   صرف 0.7 لیٹر ملا۔
⛽ پمپ:             PSO (پاکستان اسٹیٹ آئل)
📍 مقام:            📌 GPS لوکیشن منسلک
🏫 قریبی نشانی:    سٹی ہسپتال کے قریب، بلیو ایریا
📸 تصویر:           ✅ منسلک

──────────────────────────────
جمع کرانے سے پہلے اپنی شکایت کا جائزہ لیں۔

[ ✅ جمع کریں ]   [ ✏️ ترمیم ]
```

| User Action | Next State |
|---|---|
| Taps `Submit` / `جمع کریں` | → CONFIRMATION |
| Taps `Edit` / `ترمیم` | → EDIT_SELECT |

---

### 🟣 State 11a: EDIT_SELECT

**Bot sends (EN) → Interactive List**

```
✏️ Which field would you like to edit?

[ Select Field ▾ ]
────────────────────
  • Province
  • Complaint Type
  • Details
  • Pump Name
  • Location
  • Nearest Landmark
  • Image
```

**Bot sends (UR) → Interactive List**

```
✏️ آپ کون سا حصہ تبدیل کرنا چاہتے ہیں؟

[ حصہ منتخب کریں ▾ ]
────────────────────
  • صوبہ
  • شکایت کی قسم
  • تفصیلات
  • پمپ کا نام
  • مقام
  • قریبی نشانی
  • تصویر
```

| User Selects | Loops back to |
|---|---|
| Province | → PROVINCE_SELECTION → REVIEW |
| Complaint Type | → COMPLAINT_TYPE → REVIEW |
| Details | → DETAILS_INPUT → REVIEW |
| Pump Name | → PUMP_NAME → REVIEW |
| Location | → LOCATION_INPUT → REVIEW |
| Nearest Landmark | → LANDMARK_INPUT → REVIEW |
| Image | → IMAGE_UPLOAD → REVIEW |

---

### 🟣 State 12: CONFIRMATION

**Bot sends (EN) → Interactive Button (1 button)**

```
✅ *Complaint Submitted Successfully!*

🔖 Complaint ID:   FC-A3B9C2D1
📊 Status:          ⏳ Pending

Your complaint has been forwarded for review.
You will be notified when it is processed.

JazakAllah Khair 🙏

[ 🔄 New Complaint ]
```

**Bot sends (UR) → Interactive Button (1 button)**

```
✅ *شکایت کامیابی سے جمع ہو گئی!*

🔖 شکایت نمبر:  FC-A3B9C2D1
📊 اسٹیٹس:       ⏳ زیر التواء

آپ کی شکایت جائزے کے لیے بھیج دی گئی ہے۔
کارروائی ہونے پر آپ کو اطلاع دی جائے گی۔

جزاک اللہ خیر 🙏

[ 🔄 نئی شکایت ]
```

| User Action | Next State |
|---|---|
| Taps `New Complaint` / `نئی شکایت` | → LANGUAGE_SELECTION (fresh session) |

---

## Proactive Status Notifications

> These messages are sent **outbound by the system** (not triggered by user input) when an officer updates the complaint status via the admin panel.

---

### 🔔 Notification 1: Pending → In Progress

**Sent (EN):**

```
📣 *Complaint Status Update*

🔖 Complaint ID:   FC-A3B9C2D1
📊 Status:          🔄 In Progress

Your complaint is now being reviewed by our team.
We will notify you once it is resolved.
```

**Sent (UR):**

```
📣 *شکایت کی صورتحال میں تبدیلی*

🔖 شکایت نمبر:  FC-A3B9C2D1
📊 اسٹیٹس:       🔄 زیر کارروائی

آپ کی شکایت ہماری ٹیم کے زیر جائزہ ہے۔
حل ہونے پر آپ کو اطلاع دی جائے گی۔
```

---

### 🔔 Notification 2: In Progress → Resolved

**Sent (EN):**

```
✅ *Complaint Resolved!*

🔖 Complaint ID:   FC-A3B9C2D1
📊 Status:          ✅ Resolved

📝 *Officer Remarks:*
"Pump operator was found guilty of short measurement.
Fine has been issued and meter re-calibrated.
Action taken on 18-Mar-2026."

Thank you for helping us improve fuel services
in Pakistan. 🇵🇰
```

**Sent (UR):**

```
✅ *شکایت حل ہو گئی!*

🔖 شکایت نمبر:  FC-A3B9C2D1
📊 اسٹیٹس:       ✅ حل شدہ

📝 *افسر کے ریمارکس:*
"پمپ آپریٹر کم تول کا مرتکب پایا گیا۔ جرمانہ عائد کر
دیا گیا اور میٹر دوبارہ کیلیبریٹ کیا گیا۔
کارروائی مورخہ 18-مارچ-2026 کو مکمل ہوئی۔"

پاکستان میں فیول سروسز کو بہتر بنانے میں
مدد کرنے کا شکریہ۔ 🇵🇰
```

---

## Restart / Error Handling

**Trigger words (any state):** `hi`, `hello`, `start`, `restart`, `menu`, `ہیلو`, `شروع`, `مینو`

```
EN: 🔄 Restarting your session...
UR: 🔄 آپ کا سیشن دوبارہ شروع ہو رہا ہے...
```
→ Session reset → drops to **LANGUAGE_SELECTION**

---

**Session Expired (Redis TTL elapsed — 30 minutes of inactivity):**

```
EN: ⏰ Your session has expired due to inactivity. Let's start fresh!
UR: ⏰ غیرفعالیت کی وجہ سے آپ کا سیشن ختم ہو گیا۔ دوبارہ شروع کریں!
```
→ drops to **LANGUAGE_SELECTION**

---

**Generic Error:**

```
EN: ❌ Something went wrong. Please try again or type "restart".
UR: ❌ کچھ غلط ہو گیا۔ دوبارہ کوشش کریں یا "شروع" لکھیں۔
```

---

## Full FSM State Diagram

```
                    ┌──────────────────────┐
  Any message  ───► │  LANGUAGE_SELECTION  │
  or restart        └──────────┬───────────┘
                               │ EN / UR
                    ┌──────────▼───────────┐
                    │       GREETING       │
                    └──────────┬───────────┘
                               │ Start
                    ┌──────────▼───────────┐
                    │      CNIC_INPUT      │◄─── invalid CNIC (loop)
                    └──────────┬───────────┘
                               │ valid CNIC
                               │ (cooldown check)
                    ┌──────────▼───────────┐
                    │  PROVINCE_SELECTION  │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │    COMPLAINT_TYPE    │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │     DETAILS_INPUT    │◄─── < 20 chars (loop)
                    └──────────┬───────────┘
                               │ ≥ 20 chars
                    ┌──────────▼───────────┐
                    │      PUMP_NAME       │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │    LOCATION_INPUT    │◄─── non-GPS input (loop)
                    └──────────┬───────────┘
                               │ GPS pin only
                    ┌──────────▼───────────┐
                    │    LANDMARK_INPUT    │◄─── < 3 chars (loop)
                    └──────────┬───────────┘
                               │ text ≥ 3 chars
                    ┌──────────▼───────────┐
                    │     IMAGE_UPLOAD     │
                    └──────────┬───────────┘
                               │ image or skip
                    ┌──────────▼───────────┐
              ┌────►│        REVIEW        │◄──────────────────┐
              │     └──────────┬───────────┘                   │
              │                │                               │
              │         Submit │  Edit                         │
              │                │    │                          │
              │     ┌──────────▼─┐  │  ┌───────────────────┐  │
              │     │CONFIRMATION│  └─►│    EDIT_SELECT     │  │
              │     └──────────┬─┘     └─────────┬──────────┘  │
              │                │                 │             │
              │          Queue │    field loops  └─────────────┘
              │          push  │    back to selected state
              │                │
              │     ┌──────────▼──────────┐
              │     │   Redis Queue       │
              │     │ queue:complaints    │
              │     └──────────┬──────────┘
              │                │ (every 4 hours)
              │     ┌──────────▼──────────┐
              │     │  Cron Job Worker    │
              │     └──────────┬──────────┘
              │                │
              │     ┌──────────▼──────────┐
              │     │  Government API     │
              │     └─────────────────────┘
              │
              │     Async Status Notifications:
              │     pending ──► in_progress ──► Send WhatsApp message to citizen
              │                 in_progress ──► resolved ──► Send WhatsApp message + officer remarks
              │
              └──── New Complaint (back to LANGUAGE_SELECTION)
```

---

## Session Data Structure (Redis)

```json
{
  "sessionToken": "uuid-v4",
  "language": "EN | UR",
  "state": "LANGUAGE_SELECTION | GREETING | CNIC_INPUT | PROVINCE_SELECTION | COMPLAINT_TYPE | DETAILS_INPUT | PUMP_NAME | LOCATION_INPUT | LANDMARK_INPUT | IMAGE_UPLOAD | REVIEW | EDIT_SELECT | CONFIRMATION",
  "cnic": null,
  "province": null,
  "complaintType": null,
  "details": null,
  "pumpName": null,
  "latitude": null,
  "longitude": null,
  "landmark": null,
  "imageMediaId": null,
  "lastInteractionAt": "ISO timestamp"
}
```

**Redis Key:** `session:{phoneNumber}` | **TTL:** 30 minutes

---

## Complaint Draft Structure (Redis)

```json
{
  "sessionToken": "uuid-v4",
  "phoneNumber": "+923001234567",
  "language": "EN | UR",
  "cnic": "3520212345679",
  "province": "PUNJAB",
  "complaintType": "SHORT_MEASUREMENT",
  "details": "Meter was showing 1L but only 0.7L dispensed.",
  "pumpName": "PSO",
  "latitude": 33.6844,
  "longitude": 73.0479,
  "landmark": "Near City Hospital, Blue Area",
  "imageBase64": "base64encodedstring | null",
  "complaintCode": "FC-A3B9C2D1",
  "submittedAt": "ISO timestamp",
  "status": "pending",
  "_retryCount": 0
}
```

**Redis Key:** `draft:{sessionToken}` | **TTL:** 1 hour

---

## CNIC Cooldown (Redis)

**Redis Key:** `cooldown:{cnic}` | **TTL:** 24 hours  
**Value:** `"1"` (presence = blocked)

---

## Complaint Queue (Redis)

**Redis Key:** `queue:complaints` | **Type:** List (LPUSH / RPOP)  
**Worker:** Cron every 4 hours → RPOP → POST to Government API → on failure RPUSH (max 3 retries)

---

## Pump Name Options Reference

| Display (EN) | Display (UR) | ID |
|---|---|---|
| PSO (Pakistan State Oil) | PSO (پاکستان اسٹیٹ آئل) | `PSO` |
| Shell Pakistan | Shell Pakistan | `SHELL_PK` |
| Total PARCO | Total PARCO | `TOTAL_PARCO` |
| APL (Attock Petroleum) | APL (اٹاک پیٹرولیم) | `APL` |
| Cnergyico (formerly Byco) | Cnergyico (سابقہ Byco) | `CNERGYICO` |
| GO (Gas & Oil Pakistan) | GO (گیس اینڈ آئل پاکستان) | `GO` |
| Aramco | Aramco | `ARAMCO` |
| Hascol Petroleum | Hascol Petroleum | `HASCOL` |
| Puma Energy | Puma Energy | `PUMA` |
| Flow Petroleum | Flow Petroleum | `FLOW` |

---

## Province Options Reference

| Display (EN) | Display (UR) | ID |
|---|---|---|
| Punjab | پنجاب | `PUNJAB` |
| Sindh | سندھ | `SINDH` |
| Khyber Pakhtunkhwa (KPK) | خیبر پختونخوا (KPK) | `KPK` |
| Balochistan | بلوچستان | `BALOCHISTAN` |
| Islamabad (ICT) | اسلام آباد (ICT) | `ISLAMABAD` |

---

## Complaint Type Options Reference

| Display (EN) | Display (UR) | ID | Details Required |
|---|---|---|---|
| Short Measurement (کم تول) | کم تول (Short Measurement) | `SHORT_MEASUREMENT` | Optional |
| Fuel Quality Issue | ایندھن کا معیار خراب | `FUEL_QUALITY` | Optional |
| Overcharging / Wrong Rate | زیادہ قیمت / غلط ریٹ | `OVERCHARGING` | Optional |
| Pump Refused to Serve | پمپ نے سروس دینے سے انکار | `REFUSED_SERVICE` | Optional |
| Other | دیگر | `OTHER` | **Compulsory (min 10 chars)** |

---

*Approved by Team Lead — Implementation complete as of 18 March 2026.*
