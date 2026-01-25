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
  // State for modal and selected appointment
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedAppointment(event.appointment);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
  };

  return (
    <>
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
          onSelectEvent={handleSelectEvent}
          onNavigate={handleNavigate}
          date={currentDate}
          selectable
          views={["month"]}
          defaultView="month"
        />
      </div>

      {/* Appointment Details Modal */}
      {isModalOpen && selectedAppointment && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300 ease-out animate-in fade-in"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 border border-white/20 transform transition-all duration-300 ease-out animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                Appointment Details
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4">
              {/* Patient Info */}
              <div>
                <label className="text-sm font-semibold text-gray-600">
                  Patient
                </label>
                <p className="text-gray-800 mt-1">
                  {selectedAppointment.patient
                    ? `${selectedAppointment.patient.firstname} ${selectedAppointment.patient.lastname}`
                    : "Unknown Patient"}
                </p>
                {selectedAppointment.patient && (
                  <p className="text-sm text-gray-500 mt-1">
                    📞 {selectedAppointment.patient.phone}
                  </p>
                )}
              </div>

              {/* Doctor Info */}
              <div>
                <label className="text-sm font-semibold text-gray-600">
                  Doctor
                </label>
                <p className="text-gray-800 mt-1">
                  {selectedAppointment.doctor
                    ? `Dr. ${selectedAppointment.doctor.firstname} ${selectedAppointment.doctor.lastname}`
                    : "Unknown Doctor"}
                </p>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">
                    Date
                  </label>
                  <p className="text-gray-800 mt-1">
                    {format(
                      new Date(selectedAppointment.appointmentDate),
                      "MMM dd, yyyy",
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">
                    Time
                  </label>
                  <p className="text-gray-800 mt-1">
                    {selectedAppointment.appointmentTime}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-sm font-semibold text-gray-600">
                  Status
                </label>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      selectedAppointment.status === "scheduled"
                        ? "bg-blue-100 text-blue-800"
                        : selectedAppointment.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : selectedAppointment.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {selectedAppointment.status.charAt(0).toUpperCase() +
                      selectedAppointment.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Appointment ID */}
              <div>
                <label className="text-sm font-semibold text-gray-600">
                  Appointment ID
                </label>
                <p className="text-gray-500 text-sm mt-1">
                  #{selectedAppointment.id}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
