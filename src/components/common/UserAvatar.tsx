
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const UserAvatar = ({ src, name, size = "md", className }: UserAvatarProps) => {
  // Get initials from name
  const getInitials = () => {
    if (!name) return "U";
    
    const nameParts = name.split(" ");
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  // Determine avatar size
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className || ""}`}>
      <AvatarImage src={src || ""} alt={name || "User"} />
      <AvatarFallback className="bg-primary/10 text-primary">
        {src ? "" : getInitials()}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
