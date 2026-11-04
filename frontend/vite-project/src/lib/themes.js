export const themeGroups = [
  {
    label: "Light & neutral",
    themes: [
      { value: "light", label: "Light" },
      { value: "cupcake", label: "Cupcake" },
      { value: "bumblebee", label: "Bumblebee" },
      { value: "emerald", label: "Emerald" },
      { value: "corporate", label: "Corporate" },
      { value: "retro", label: "Retro" },
      { value: "valentine", label: "Valentine" },
      { value: "garden", label: "Garden" },
      { value: "lofi", label: "Lo-Fi" },
      { value: "pastel", label: "Pastel" },
      { value: "fantasy", label: "Fantasy" },
      { value: "wireframe", label: "Wireframe" },
      { value: "cmyk", label: "CMYK" },
      { value: "autumn", label: "Autumn" },
      { value: "lemonade", label: "Lemonade" },
      { value: "winter", label: "Winter" },
      { value: "nord", label: "Nord" },
      { value: "caramellatte", label: "Caramel Latte" },
      { value: "silk", label: "Silk" },
    ],
  },
  {
    label: "Vibrant",
    themes: [
      { value: "cyberpunk", label: "Cyberpunk" },
      { value: "forest", label: "Forest" },
      { value: "aqua", label: "Aqua" },
      { value: "acid", label: "Acid" },
      { value: "synthwave", label: "Synthwave" },
    ],
  },
  {
    label: "Dark",
    themes: [
      { value: "dark", label: "Dark" },
      { value: "halloween", label: "Halloween" },
      { value: "black", label: "Black" },
      { value: "luxury", label: "Luxury" },
      { value: "dracula", label: "Dracula" },
      { value: "business", label: "Business" },
      { value: "night", label: "Night" },
      { value: "coffee", label: "Coffee" },
      { value: "dim", label: "Dim" },
      { value: "sunset", label: "Sunset" },
      { value: "abyss", label: "Abyss" },
    ],
  },
];

export const isAppTheme = (value) =>
  themeGroups.some((group) =>
    group.themes.some((theme) => theme.value === value),
  );

export const getSavedTheme = () => {
  try {
    const savedTheme = localStorage.getItem("vibetalk-theme");
    return isAppTheme(savedTheme) ? savedTheme : "light";
  } catch (error) {
    console.error("Could not read your saved theme preference.", error);
    return "light";
  }
};
