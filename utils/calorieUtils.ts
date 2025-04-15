export function calculateDailyCalories({
    gender,
    age,
    weight,
    height,
    activityLevel,
}: {
    gender: string;
    age: number;
    weight: number;
    height: number;
    activityLevel: string;
}): number {
    let bmr;

    if (gender === 'male') {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else if (gender === 'female') {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    } else {
        bmr = 10 * weight + 6.25 * height - 5 * age;
    }

    const activityMultipliers: Record<string, number> = {
        sedentary: 1.2,      
        light: 1.375,        
        moderate: 1.55,      
        active: 1.725,       
        super_active: 1.9    
    };

    const multiplier = activityMultipliers[activityLevel] ?? 1.2;
    return Math.round(bmr * multiplier);
}

export function calculateDailyMacros({
    weight,
    dailyCalories,
    activityLevel,
  }: {
    weight: number;
    dailyCalories: number;
    activityLevel: string;
  }) {
    const proteinMultipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.4,
      moderate: 1.6,
      active: 1.8,
      super_active: 2.0,
    };
  
    const proteinPerKg = proteinMultipliers[activityLevel] ?? 1.2;
    const proteinG = weight * proteinPerKg;
    const proteinCals = proteinG * 4;
  
    const fatCals = dailyCalories * 0.25; // Adjusted to 25% from fats
    const fatG = fatCals / 9;
  
    const remainingCals = dailyCalories - (proteinCals + fatCals);
    const carbsG = remainingCals / 4;
  
    return {
      proteinG: Math.round(proteinG),
      fatG: Math.round(fatG),
      carbsG: Math.round(carbsG),
    };
  }