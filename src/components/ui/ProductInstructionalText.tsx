import React from 'react';

interface ProductInstructionalTextProps {
  productType: 'asmr' | 'podcast' | 'video_ad' | 'fashion' | 'astrology' | 'cover_submission';
  className?: string;
  isForSale?: boolean; // Hide instructional text for finalized products that are for sale
}

const ProductInstructionalText = ({ productType, className = "", isForSale = false }: ProductInstructionalTextProps) => {
  const getInstructionalText = () => {
    switch (productType) {
      case 'asmr':
      case 'podcast':
        return 'Download audio for in-depth instructions';
      case 'video_ad':
      case 'cover_submission':
        return 'Download audio for creative purposes';
      case 'fashion':
        return 'View product details and purchase';
      case 'astrology':
        return 'Book consultation service';
      default:
        return '';
    }
  };

  const text = getInstructionalText();
  
  // Don't show instructional text for finalized products that are for sale
  if (!text || isForSale) return null;

  return (
    <p className={`text-xs text-gray-500 mb-2 italic ${className}`}>
      {text}
    </p>
  );
};

export default ProductInstructionalText;