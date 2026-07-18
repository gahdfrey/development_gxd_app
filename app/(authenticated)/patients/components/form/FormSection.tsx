import { ReactNode } from "react";

interface FormSectionProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  accentColor: "blue" | "purple";
  children: ReactNode;
}

export default function FormSection({
  icon,
  title,
  subtitle,
  accentColor,
  children,
}: FormSectionProps) {
  const colorClasses = {
    blue: {
      border: "bg-linear-to-b from-blue-500 to-indigo-600",
      iconBg: "bg-linear-to-br from-blue-100 to-indigo-100",
      iconColor: "text-blue-600",
      sectionBg: "bg-linear-to-br from-blue-50/30 to-indigo-50/30",
      borderColor: "border-blue-100",
    },
    purple: {
      border: "bg-linear-to-b from-purple-500 to-indigo-600",
      iconBg: "bg-linear-to-br from-purple-100 to-indigo-100",
      iconColor: "text-purple-600",
      sectionBg: "bg-linear-to-br from-purple-50/30 to-indigo-50/30",
      borderColor: "border-purple-100",
    },
  };

  const colors = colorClasses[accentColor];

  return (
    <div className="relative">
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${colors.border} rounded-full`}
      ></div>
      <div className="pl-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-2 ${colors.iconBg} rounded-xl`}>
            <div className={colors.iconColor}>{icon}</div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div
          className={`space-y-5 ${colors.sectionBg} rounded-2xl p-6 border ${colors.borderColor}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
