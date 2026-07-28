# Documentation de l'API REST Server-Side

## 🔐 1. Authentification (`/api/auth/*`)

### Connexion Utilisateur
- **POST** `/api/auth/login`
- **Corps JSON** :
  ```json
  {
    "email": "jean.peeters@email.be",
    "password": "MonMotDePasseTest123!", // gitleaks:allow
    "totpCode": "123456"
  }
  ```
- **Réponse** : Cookie `zlobodan_session` posé en `httpOnly`, `Secure`, `SameSite=Lax`.

### Inscription Client
- **POST** `/api/auth/register`
- **Corps JSON** :
  ```json
  {
    "email": "nouveau.client@email.be",
    "password": "MonMotDePasseTest123!", // gitleaks:allow
    "phone": "0470 12 34 56"
  }
  ```

---

## 📄 2. Devis Client & Signatures (`/api/client/devis/*`)

### Acceptation de Devis en Ligne
- **POST** `/api/client/devis/[id]/accept`
- **Description** : Marque le devis comme accepté, enregistre l'horodatage et inscrit la preuve d'IP hachée dans le registre d'audit `audit_log`.

---

## 🧾 3. Générateur PDF Serveur (`/api/pdf/*`)

### Téléchargement Devis PDF
- **GET** `/api/pdf/quote/[id]`
- **Format** : Fichier HTML/PDF avec mentions légales belges obligatoires.

### Téléchargement Facture Immuable PDF
- **GET** `/api/pdf/invoice/[id]`
- **Format** : Fichier HTML/PDF avec mentions légales belges obligatoires.
