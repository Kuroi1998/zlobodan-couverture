import React from "react";
import { Upload, X, Send } from "lucide-react";
import { FormDataState } from "../quote-form.types";

interface Step5Props {
  formData: FormDataState;
  setFormData: React.Dispatch<React.SetStateAction<FormDataState>>;
  photos: { file: File; preview: string }[];
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  removePhoto: (index: number) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
  isCompressing: boolean;
}

export const Step5ContactPhoto: React.FC<Step5Props> = ({
  formData,
  setFormData,
  photos,
  handlePhotoUpload,
  removePhoto,
  handleSubmit,
  isSubmitting,
  isCompressing,
}) => {
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="font-heading font-extrabold text-2xl text-slate-900">
          5. Vos Coordonnées &amp; Photos du chantier
        </h2>
        <p className="text-sm text-slate-600">
          Dernière étape ! Votre devis vous sera adressé sous 48h maximum.
        </p>
      </div>

      {/* Honeypot hidden input for anti-spam */}
      <input
        type="text"
        name="website_url"
        value={formData.honeypot}
        onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase">
            Nom &amp; Prénom *
          </label>
          <input
            type="text"
            required
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="Ex: Jean Peeters"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-brand-terracotta"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase">
            Numéro de Téléphone *
          </label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Ex: 0470 12 34 56"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-brand-terracotta"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 uppercase">
          Adresse Email *
        </label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Ex: jean.peeters@email.be"
          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-brand-terracotta"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 uppercase">
          Précisions complémentaires (facultatif)
        </label>
        <textarea
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Décrivez votre projet (accès au toit, hauteur d'étage, symptômes de la fuite...)"
          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-brand-terracotta"
        />
      </div>

      {/* Photo Drag & Drop Upload */}
      <div className="space-y-3">
        <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center justify-between">
          <span>Ajouter des photos du chantier (5 max)</span>
          <span className="text-slate-400 font-normal">Compression auto client-side</span>
        </label>

        <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-brand-terracotta transition bg-slate-50">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handlePhotoUpload}
            id="photo-upload-input"
            className="hidden"
          />
          <label
            htmlFor="photo-upload-input"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="h-8 w-8 text-brand-terracotta" />
            <span className="text-sm font-bold text-slate-800">
              Cliquez ou glissez vos photos ici
            </span>
            <span className="text-xs text-slate-500">
              PNG, JPG, WebP jusqu'à 10 Mo par photo
            </span>
          </label>
        </div>

        {/* Photos Previews */}
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-2">
            {photos.map((item, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                {/* next/image ne sait pas traiter une URL blob: locale, seule
                    source disponible pour prévisualiser avant envoi. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.preview} alt={`Aperçu ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RGPD Consent */}
      <div className="flex items-start gap-3 pt-2">
        <input
          type="checkbox"
          id="rgpd"
          checked={formData.rgpdConsent}
          onChange={(e) => setFormData({ ...formData, rgpdConsent: e.target.checked })}
          className="mt-1 h-4 w-4 text-brand-terracotta rounded border-slate-300 focus:ring-brand-terracotta"
        />
        <label htmlFor="rgpd" className="text-xs text-slate-600 leading-normal">
          J'accepte que mes données soient conservées par Zlobodan Couverture SRL dans le cadre exclusif du chiffrage de ma demande de devis conformément au RGPD. *
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || isCompressing}
        className="w-full bg-brand-terracotta hover:bg-orange-600 text-white font-extrabold py-4 px-6 rounded-2xl text-base shadow-accent transition hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <span>Envoi sécurisé en cours...</span>
        ) : (
          <>
            <Send className="h-5 w-5" />
            <span>Envoyer ma Demande de Devis Gratuit</span>
          </>
        )}
      </button>
    </form>
  );
};
