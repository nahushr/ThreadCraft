const isValidEmail = (email: string): boolean => {
  for (const character of email) {
    if (character.trim().length === 0) return false;
  }

  const atIndex = email.indexOf("@");
  if (atIndex <= 0 || atIndex !== email.lastIndexOf("@")) return false;

  const domain = email.slice(atIndex + 1);
  const lastDot = domain.lastIndexOf(".");
  return lastDot > 0 && lastDot < domain.length - 1;
};

export default isValidEmail;
