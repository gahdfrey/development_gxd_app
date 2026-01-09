"use client";

import { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, Event } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./AppointmentCalendar.css";

const locales = {
  "en-US": require("date-fns/locale/en-US"),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface Appointment {
  id: number;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  patient: {
    id: number;
    firstname: string;
    lastname: string;
    phone: string;
  } | null;
  doctor: {
    id: number;
    firstname: string;
    lastname: string;
  } | null;
}

interface AppointmentCalendarProps {
  appointments: Appointment[];
  onDateSelect?: (date: Date | undefined) => void;
  selectedDate?: Date;
}

interface CalendarEvent extends Event {
  appointment: Appointment;
  status: string;
}

export default function AppointmentCalendar({
  appointments,
  onDateSelect,
  selectedDate,
}: AppointmentCalendarProps) {
  // State to track current date being displayed
  const [currentDate, setCurrentDate] = useState(new Date());
  // Convert appointments to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return appointments.map((appointment) => {
      const [hours, minutes] = appointment.appointmentTime.split(":");
      const start = new Date(appointment.appointmentDate);
      start.setHours(parseInt(hours), parseInt(minutes), 0);

      const end = new Date(start);
      end.setHours(start.getHours() + 1); // Default 1-hour appointments

      return {
        start,
        end,
        title: appointment.patient
          ? `${appointment.patient.firstname} ${appointment.patient.lastname}`
          : "Unknown Patient",
        appointment,
        status: appointment.status,
      };
    });
  }, [appointments]);

  // Custom event style getter
  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = "#3b82f6"; // Default blue
    let borderColor = "#2563eb";

    switch (event.status) {
      case "scheduled":
        backgroundColor = "#3b82f6"; // Blue
        borderColor = "#2563eb";
        break;
      case "completed":
        backgroundColor = "#10b981"; // Green
        borderColor = "#059669";
        break;
      case "cancelled":
        backgroundColor = "#ef4444"; // Red
        borderColor = "#dc2626";
        break;
      case "no-show":
        backgroundColor = "#eab308"; // Yellow
        borderColor = "#ca8a04";
        break;
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth: "2px",
        borderStyle: "solid",
        borderRadius: "0.375rem",
        color: "white",
        fontWeight: "500",
      },
    };
  };

  const handleSelectSlot = ({ start }: { start: Date; end: Date }) => {
    if (onDateSelect) {
      onDateSelect(start);
    }
  };

  const handleNavigate = (date: Date) => {
    setCurrentDate(date);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800 mb-2">
          Appointment Calendar
        </h3>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            <span className="text-gray-600">Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span className="text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span className="text-gray-600">Cancelled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500"></div>
            <span className="text-gray-600">No-Show</span>
          </div>
        </div>
      </div>

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        eventPropGetter={eventStyleGetter}
        onSelectSlot={handleSelectSlot}
        onNavigate={handleNavigate}
        date={currentDate}
        selectable
        views={["month"]}
        defaultView="month"
      />
    </div>
  );
}
