export const extractStreamedText = (jsonString: string): string => {
  const match = jsonString.match(/"summary"\s*:\s*"([^]*)/);
  if (!match) {
    // En el peor caso, limpiamos el JSON base para mostrar algo legible
    return jsonString.replace(/[{}"[\]]/g, '').trim();
  }

  let val = match[1];

  // Cortar la cadena si ya terminó la propiedad summary
  const endMatch = val.match(/(?<!\\)"\s*[,}]/);
  if (endMatch && endMatch.index !== undefined) {
    val = val.substring(0, endMatch.index);
  }

  return val.replace(/\\n/g, '\n').replace(/\\"/g, '"');
};
