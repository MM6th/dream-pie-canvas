import React from 'react';

interface ProductInstructionalTextProps {
  productType: 'asmr' | 'podcast' | 'video_ad' | 'fashion' | 'astrology';
  className?: string;
}

const ProductInstructionalText = ({ productType, className = "" }: ProductInstructionalTextProps) => {
  const getInstructionalText = () => {
    switch (productType) {
      case 'asmr':
      case 'podcast':
        return 'Download audio for in-depth instructions';
      case 'video_ad':
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
  
  if (!text) return null;

  return (
    <p className={`text-xs text-gray-500 mb-2 italic ${className}`}>
      {text}
    </p>
  );
};

export default ProductInstructionalText;