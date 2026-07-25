# Server-Side REST API Documentation

## 🔐 1. Authentication (`/api/auth/*`)

### User Login
- **POST** `/api/auth/login`
- **JSON Payload**:
  ```json
  {
    "email": "jean.peeters@email.be",
    "password": "secure-password-min-12-chars",
    "totpCode": "123456"
  }
  ```
- **Response**: Cookie `zlobodan_session` set with `httpOnly`, `Secure`, `SameSite=Lax`.

### Client Registration
- **POST** `/api/auth/register`
- **JSON Payload**:
  ```json
  {
    "email": "new.client@email.be",
    "password": "secure-password-min-12-chars",
    "phone": "0470 12 34 56"
  }
  ```

---

## 📄 2. Client Quotes & Online Signatures (`/api/client/devis/*`)

### Online Quote Acceptance
- **POST** `/api/client/devis/[id]/accept`
- **Description**: Marks the quote as accepted, records the timestamp, and writes the hashed IP proof to the `audit_log`.

---

## 🧾 3. Server PDF Generator (`/api/pdf/*`)

### PDF Quote Download
- **GET** `/api/pdf/quote/[id]`
- **Format**: HTML/PDF with mandatory Belgian legal notices.

### PDF Immutable Invoice Download
- **GET** `/api/pdf/invoice/[id]`
- **Format**: HTML/PDF with mandatory Belgian legal notices.
