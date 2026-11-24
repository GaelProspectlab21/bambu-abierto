export type FoodCheckinAnswers = { hunger: 'normal' | 'often' | 'little'; breakfast: 'yes' | 'sometimes' | 'no'; energy: 'good' | 'low' | 'rest' }

/** General support, not a diagnosis, weight plan or calorie prescription. */
export function foodCheckinAdvice(a: FoodCheckinAnswers): string[] {
  const lines = ['Combina alimentos variados: cereales o tortilla, proteína, frutas y verduras. Toma agua y date tiempo para comer.']
  if (a.breakfast !== 'yes') lines.push('Deja listo un desayuno fácil con tu familia, como avena con leche o huevo con tortilla. Si tienes prisa, lleva algo para comer.')
  if (a.hunger === 'often') lines.push('Si tienes hambre entre comidas, puedes comer una colación, como fruta con yogur o un sándwich. Escucha tu hambre.')
  if (a.hunger === 'little') lines.push('Si te cuesta comer o se te quita el hambre seguido, cuéntaselo a un adulto de confianza y a tu pediatra.')
  if (a.energy === 'low') lines.push('El cansancio puede tener varias causas. Revisa con un adulto tus comidas, agua, descanso y entrenamiento. Si se repite, coméntalo con tu pediatra.')
  if (a.energy === 'good') lines.push('Qué bueno que te sientes con energía. Mantén horarios de comida que te funcionen y descansa después de entrenar.')
  return lines
}
