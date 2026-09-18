import { useTranslation } from "react-i18next";
import { Select, MenuItem, type SxProps, type Theme } from "@mui/material";

interface Props {
  sx?: SxProps<Theme>;
}

export default function LanguageSwitcher({ sx }: Props) {
  const { i18n } = useTranslation();
  const value = i18n.language.startsWith("es") ? "es" : "en";
  return (
    <Select
      size="small"
      value={value}
      aria-label="Language"
      onChange={(e) => {
        const lng = e.target.value as string;
        void i18n.changeLanguage(lng);
        localStorage.setItem("lang", lng);
      }}
      sx={{
        minWidth: 72,
        bgcolor: "action.selected",
        borderRadius: 8,
        ...((sx as object) ?? {}),
      }}
    >
      <MenuItem value="en">EN</MenuItem>
      <MenuItem value="es">ES</MenuItem>
    </Select>
  );
}
