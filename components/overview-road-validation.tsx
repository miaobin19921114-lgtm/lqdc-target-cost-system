'use client';

import { useEffect } from 'react';

export function OverviewRoadValidation() {
  useEffect(() => {
    const roadInput = document.querySelector<HTMLInputElement>('input[name="roadArea"]');
    const fireInput = document.querySelector<HTMLInputElement>('input[name="fireRoadArea"]');
    if (!roadInput || !fireInput) return;

    const validate = () => {
      const roadArea = Number(roadInput.value || 0);
      const fireRoadArea = Number(fireInput.value || 0);
      fireInput.setCustomValidity(fireRoadArea > roadArea ? '消防道路面积不得大于车行道路面积。' : '');
    };

    roadInput.addEventListener('input', validate);
    fireInput.addEventListener('input', validate);
    validate();

    return () => {
      roadInput.removeEventListener('input', validate);
      fireInput.removeEventListener('input', validate);
    };
  }, []);

  return null;
}
