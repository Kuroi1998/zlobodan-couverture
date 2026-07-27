import React from "react";
import Image from "next/image";
import { FileText, Upload, X, Send } from "lucide-react";
import { FormDataState } from "../quote-form.types";
import TurnstileWidget from "@/components/forms/TurnstileWidget";

interface Step5Props {
  formData: FormDataState;
  setFormData: React.Dispatch<React.SetStateAction<FormDataState>>;
  photos: { file: File; preview: string | null }[];
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
          Dernière étape. Nous analysons votre demande et revenons vers vous
          avec un chiffrage détaillé.
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
          <label htmlFor="quote-fullname" className="text-xs font-bold text-slate-700 uppercase">
            Nom &amp; Prénom *
          </label>
          <input
            id="quote-fullname"
            name="fullName"
            type="text"
            required
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="Ex: Jean Peeters"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-brand-terracotta"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="quote-phone" className="text-xs font-bold text-slate-700 uppercase">
            Numéro de Téléphone *
          </label>
          <input
            id="quote-phone"
            name="phone"
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Ex : 04XX XX XX XX"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-brand-terracotta"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="quote-email" className="text-xs font-bold text-slate-700 uppercase">
          Adresse Email *
        </label>
        <input
          id="quote-email"
          name="email"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Ex: jean.peeters@email.be"
          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-brand-terracotta"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="quote-description" className="text-xs font-bold text-slate-700 uppercase">
          Précisions complémentaires (facultatif)
        </label>
        <textarea
          id="quote-description"
          name="description"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Décrivez votre projet (accès au toit, hauteur d'étage, symptômes de la fuite...)"
          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-brand-terracotta"
        />
      </div>

      {/* Photo Drag & Drop Upload */}
      <div className="space-y-3">
        <span className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center justify-between">
          <span>Ajouter des photos ou un PDF (5 max)</span>
          <span className="text-slate-400 font-normal">Compression auto client-side</span>
        </span>

        <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-brand-terracotta transition bg-slate-50">
          <input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
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
              PNG, JPG, WebP ou PDF jusqu'à 10 Mo par fichier
            </span>
          </label>
        </div>

        {/* Photos Previews */}
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-2">
            {photos.map((item, idx) => (
              <div key={`${item.file.name}-${idx}`} className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
                {item.preview ? (
                  <Image
                    src={item.preview}
                    alt={`Aperçu ${idx + 1}`}
                    fill
                    sizes="80px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <FileText className="h-8 w-8 text-slate-500" aria-label={item.file.name} />
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  aria-label={`Supprimer photo ${idx + 1}`}
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

      <TurnstileWidget
        onToken={(captchaToken) => setFormData((current) => ({ ...current, captchaToken }))}
      />

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
