# Fuel Complaint System — API Payload Documentation

**Version:** 1.0  
**Date:** March 2025  
**For:** Backend Development Team

---

## Overview

The WhatsApp bot collects complaint data from citizens and POSTs a single JSON object to the backend API endpoint. This document defines every key, its type, allowed values, and validation rules.

---

## Endpoint

```
POST {COMPLAINT_API_URL}
Content-Type: multipart/form-data  (when image is attached)
Content-Type: application/json     (fallback — no image)
```

The URL is configured via the `COMPLAINT_API_URL` environment variable on the bot server.

### Multipart/Form-Data Fields (with image)

When the user uploads an image, the bot downloads the actual file from Meta's WhatsApp Cloud API and sends it as `multipart/form-data`:

| Field          | Type     | Description                                   |
|----------------|----------|-----------------------------------------------|
| `image`        | File     | The image file (JPEG or PNG, max 5 MB)       |
| `user`         | String   | JSON-encoded `user` object                    |
| `location`     | String   | JSON-encoded `location` object                |
| `complaint`    | String   | JSON-encoded `complaint` object               |
| `complaintCode`| String   | Bot-generated reference code (e.g. `FC-42891`)|

Each JSON field should be parsed by the backend from the form-data string value.

---

## Full Payload Structure

```json
{
  "user": {
    "phoneNumber": "923001234567",
    "cnic": "3520212345678"
  },
  "location": {
    "lat": 33.6844,
    "lng": 73.0479,
    "city": "Rawalpindi",
    "province": "Punjab",
    "nearestLandmark": "Near Committee Chowk"
  },
  "complaint": {
    "type": "FUEL_QUALITY",
    "pumpBrand": "PSO",
    "description": "Petrol quality is very poor, causing engine knocking.",
    "images": [
      { "mediaId": "wamid.HBgM..." }
    ]
  },
  "complaintCode": "FC-42891"
}
```

---

## 1. `user` Object

| Key           | Type   | Required | Validation                              | Description                        |
|---------------|--------|----------|-----------------------------------------|------------------------------------|
| `phoneNumber` | String | Yes      | 12 digits, starts with `92` — regex `^\d{12}$` | WhatsApp number with country code |
| `cnic`        | String | Yes      | 13–14 digits — regex `^\d{13,14}$`     | National ID (CNIC / B-Form)        |

---

## 2. `location` Object

| Key               | Type   | Required | Validation / Allowed Values                                                                | Description                      |
|-------------------|--------|----------|--------------------------------------------------------------------------------------------|----------------------------------|
| `lat`             | Number | Yes      | `-90.0` to `90.0`                                                                          | GPS latitude of the fuel pump    |
| `lng`             | Number | Yes      | `-180.0` to `180.0`                                                                        | GPS longitude of the fuel pump   |
| `city`            | String | Yes*     | Max 100 chars. May be `null` if geocoding failed.                                          | City / town name                 |
| `province`        | String | Yes*     | **Enum** — see Province Enum below. May be `null` if geocoding failed.                    | Province or territory            |
| `nearestLandmark` | String | Yes      | Max 255 chars. Required field.                                                             | User-provided nearby landmark    |

> `*` — `city` and `province` are auto-derived from GPS coordinates via OpenStreetMap Nominatim. Treat `null` gracefully if reverse geocoding failed.

### Province Enum

| Value               | Meaning                        |
|---------------------|--------------------------------|
| `"Punjab"`          | Punjab                         |
| `"Sindh"`           | Sindh                          |
| `"KPK"`             | Khyber Pakhtunkhwa             |
| `"Balochistan"`     | Balochistan                    |
| `"Islamabad"`       | Islamabad Capital Territory    |
| `"Gilgit Baltistan"`| Gilgit-Baltistan               |
| `"Azad Kashmir"`    | Azad Jammu & Kashmir           |

---

## 3. `complaint` Object

| Key           | Type   | Required | Validation / Allowed Values                         | Description                          |
|---------------|--------|----------|-----------------------------------------------------|--------------------------------------|
| `type`        | String | Yes      | **Enum** — see Complaint Type Enum below            | Category of the complaint            |
| `pumpBrand`   | String | Yes      | **Enum** — see Pump Brand Enum below                | Fuel pump brand being complained about |
| `description` | String | Yes      | Min 10 chars, max 1000 chars                        | Free-text complaint details          |
| `images`      | Array/File | Yes   | When using multipart/form-data, the image is sent as a file field. When using JSON, array of `{ mediaId: String }`. | Evidence photo (required)        |

### Complaint Type Enum

| Enum Value          | Display Label (English)      | Display Label (Urdu)       |
|---------------------|------------------------------|----------------------------|
| `SHORT_MEASUREMENT` | Short Measurement            | Kam Miqdar                 |
| `FUEL_QUALITY`      | Fuel Quality Issue           | Petrol Kharab              |
| `OVERCHARGING`      | Overcharging                 | Zyada Qeemat               |
| `REFUSED_SERVICE`   | Refused to Serve             | Service Se Inkar           |
| `ADULTERATION`      | Adulteration                 | Milawat                    |
| `ILLEGAL_STATION`   | Illegal Station              | Ghair Qanooni              |
| `MISBEHAVIOR`       | Staff Misbehavior            | Bura Bartao                |
| `OTHER`             | Other                        | Doosri Shikayat            |

### Pump Brand Enum

| Enum Value  | Display Label                    |
|-------------|----------------------------------|
| `PSO`       | Pakistan State Oil (PSO)         |
| `SHELL`     | Shell Pakistan                   |
| `TOTAL`     | Total PARCO                      |
| `HASCOL`    | Hascol Petroleum                 |
| `GO`        | Gas & Oil Pakistan (GO)          |
| `APL`       | Attock Petroleum (APL)           |
| `BYCO`      | Byco Petroleum                   |
| `ARAMCO`    | Saudi Arabian Oil Company (ARAMCO) |
| `EURO_OIL`  | Euro Oil                         |
| `OILMAN`    | Oilman Pakistan                  |
| `PEARL`     | Pearl Energy                     |
| `AL_HABIB`  | Al-Habib Petroleum               |
| `OTHER`     | Other / Unknown                  |

---

## 4. `images` Array (inside `complaint`)

Each item in the `images` array:

| Key       | Type   | Required | Description                                            |
|-----------|--------|----------|--------------------------------------------------------|
| `mediaId` | String | Yes      | WhatsApp media message ID (from Meta Cloud API payload) |

If no image was uploaded, this will be an empty array `[]`, not `null`.

---

## 5. `complaintCode`

| Key             | Type   | Required | Format                | Description                           |
|-----------------|--------|----------|-----------------------|---------------------------------------|
| `complaintCode` | String | Yes      | `FC-` + 5 digits, e.g. `FC-42891` | Bot-generated reference code. Backend may override or ignore. |

---

## Validation Rules for Backend

1. **`user.phoneNumber`** — validate with regex `^\d{12}$` (12 digits, no `+` prefix).
2. **`user.cnic`** — validate with regex `^\d{13,14}$`.
3. **`location.province`** — must match the Province Enum. Reject or flag if unknown.
4. **`complaint.type`** — must be one of the 8 Complaint Type enum values. Reject if invalid.
5. **`complaint.pumpBrand`** — must be one of the 13 Pump Brand enum values. Reject if invalid.
6. **`complaint.description`** — min 10 chars, max 1000 chars.
7. **`complaint.images`** — optional array. If present, each item must have `mediaId` (non-empty string).
8. **`location.lat` / `lng`** — may be `null` only if GPS was not captured (handle gracefully).
9. **`complaintCode`** — treat as a bot-side reference; backend may generate its own ID.

---

## Example — Complete Payload

```json
{
  "user": {
    "phoneNumber": "923001234567",
    "cnic": "3520212345678"
  },
  "location": {
    "lat": 31.5204,
    "lng": 74.3587,
    "city": "Lahore",
    "province": "Punjab",
    "nearestLandmark": "Near Barkat Market"
  },
  "complaint": {
    "type": "OVERCHARGING",
    "pumpBrand": "SHELL",
    "description": "The pump charged Rs. 320/litre instead of the official rate of Rs. 285.",
    "images": [
      { "mediaId": "wamid.HBgMOTIzMDczNzA4NjY4..." }
    ]
  },
  "complaintCode": "FC-73821"
}
```

---

## Example — No Image, No Landmark

```json
{
  "user": {
    "phoneNumber": "923151234567",
    "cnic": "4220112345678"
  },
  "location": {
    "lat": 24.8607,
    "lng": 67.0011,
    "city": "Karachi",
    "province": "Sindh",
    "nearestLandmark": null
  },
  "complaint": {
    "type": "ADULTERATION",
    "pumpBrand": "PSO",
    "description": "Petrol mixed with water, my car stalled twice.",
    "images": []
  },
  "complaintCode": "FC-10234"
}
```

---

## Environment Variable

Set this on the bot server to enable forwarding:

```
COMPLAINT_API_URL=https://your-backend.com/api/complaints
```

If not set, the bot still works — the payload is printed to the server console log only.

---

## Notes

- When an image is attached, the bot downloads the actual image from Meta's WhatsApp Cloud API, validates it (MIME type, magic bytes, size ≤ 5 MB), and sends it as `multipart/form-data`.
- The bot does not retry on failure — it is the backend's responsibility to acknowledge and queue.
- All enum values are **uppercase with underscores** — match exactly (case-sensitive).
- Image is now **required** — complaints cannot be submitted without a photo.
- Nearest landmark is now **required**.

---

## Status Check API

### Endpoint

```
GET {STATUS_API_URL}?phoneNumber=923001234567&cnic=3520212345678
```

The URL is configured via the `STATUS_API_URL` environment variable.

### Expected Response

```json
{
  "complaint": {
    "complaintCode": "FC-42891",
    "status": "pending",
    "type": "FUEL_QUALITY",
    "created_at": "2025-03-15T10:30:00Z"
  }
}
```

Or for multiple complaints:

```json
{
  "complaints": [
    {
      "complaintCode": "FC-42891",
      "status": "pending",
      "type": "FUEL_QUALITY",
      "created_at": "2025-03-15T10:30:00Z"
    }
  ]
}
```

The bot will display the first complaint's status to the user.
