import React from 'react';
import { IMAGES } from '../lib/images';
import { OptimizedPicture } from './OptimizedImage';

export const TrackIllustration: React.FC<{ type: string; className?: string }> = ({
  type,
  className = 'w-[112px] h-[84px] sm:w-[122px] sm:h-[92px] xl:w-[130px] xl:h-[98px]',
}) => {
  switch (type) {
    case 'formulation-pill':
    case 'liposome-carrier':
      return (
        <OptimizedPicture
          src={IMAGES.track01Pharmaceutics}
          alt="Pharmaceutical Technology & Pharmaceutics"
          className={`${className} object-contain`}
          sizes="140px"
          loading="lazy"
        />
      );

    case 'dna-target':
    case 'target-protein':
      return (
        <OptimizedPicture
          src={IMAGES.track02Pharmacology}
          alt="Pharmacology & Experimental Therapeutics"
          className={`${className} object-contain`}
          sizes="140px"
          loading="lazy"
        />
      );

    case 'chemistry-flask':
    case 'antibody-modality':
      return (
        <OptimizedPicture
          src={IMAGES.track03PharmaceuticalChemistry}
          alt="Pharmaceutical Chemistry & Drug Discovery"
          className={`${className} object-contain`}
          sizes="140px"
          loading="lazy"
        />
      );

    case 'analytics-flask':
    case 'laptop-ai':
      return (
        <OptimizedPicture
          src={IMAGES.track04PharmaceuticalAnalysis}
          alt="Pharmaceutical Analysis & Analytical Technologies"
          className={`${className} object-contain`}
          sizes="140px"
          loading="lazy"
        />
      );

    case 'clinical-hospital':
    case 'preclinical-mouse':
      return (
        <OptimizedPicture
          src={IMAGES.track05PharmacyPractice}
          alt="Pharmacy Practice & Clinical Pharmacy"
          className={`${className} object-contain`}
          sizes="140px"
          loading="lazy"
        />
      );

    case 'natural-leaf':
    case 'human-dna':
      return (
        <OptimizedPicture
          src={IMAGES.track06Pharmacognosy}
          alt="Pharmacognosy & Natural Product Research"
          className={`${className} object-contain`}
          sizes="140px"
          loading="lazy"
        />
      );

    case 'regulatory-scale':
    case 'regulatory-shield':
    default:
      return (
        <OptimizedPicture
          src={IMAGES.track07RegulatoryQuality}
          alt="Regulatory Affairs & Pharmaceutical Quality Assurance"
          className={`${className} object-contain`}
          sizes="140px"
          loading="lazy"
        />
      );
  }
};
