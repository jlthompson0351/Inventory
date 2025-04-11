
import { Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface OrganizationAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const OrganizationAvatar = ({ src, name, size = "md", className }: OrganizationAvatarProps) => {
  // Get initials from organization name
  const getInitials = () => {
    if (!name) return "O";
    
    const nameParts = name.split(" ");
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
  };

  // Determine avatar size
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className || ""}`}>
      <AvatarImage src={src || ""} alt={name || "Organization"} />
      <AvatarFallback className="bg-secondary text-secondary-foreground">
        {src ? "" : getInitials()}
      </AvatarFallback>
    </Avatar>
  );
};

export default OrganizationAvatar;
