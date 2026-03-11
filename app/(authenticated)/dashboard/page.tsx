"use client";

import {useState, useMemo} from "react";
import {createColumnHelper} from "@tanstack/react-table";
import useSWR, {mutate} from "swr";
import {fetcher} from "@/lib/fetcher";
import {usePatientFilters} from "@/lib/hooks/usePatientFilters";
import Table from "@/app/components/ui/Table";
import Modal from "@/app/components/ui/Modal";
import CreatePatientModal from "./components/CreatePatientModal";
import EditPatientModal from "./components/EditPatientModal";
import ViewPatientModal from "./components/ViewPatientModal";
import {PencilSquareIcon, TrashIcon, EyeIcon, PlusIcon} from "@heroicons/react/24/outline";
import {useToast} from "@/app/contexts/ToastContext";
import PermissionDenied from "@/app/components/ui/PermissionDenied";

interface Patient {
    id: number;
    firstname: string;
    lastname: string;
    gender: string;
    dob: string;
    maidenName: string;
    countryCode: string;
    phone: string;
    insuranceType: string;
    createdAt: string;
    updatedAt: string;
}

export default function DashboardPage() {
    const {filterState, setFilters, resetFilters, queryString} = usePatientFilters();

    const {
        data: patients = [],
        error,
        isLoading
    } = useSWR < Patient[] > (`/api/patients${queryString}`, fetcher);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState < Patient | null > (null);
    const [selectedPatientId, setSelectedPatientId] = useState < number | null > (null,);
    const {showToast} = useToast();

    const handleDeletePatient = async () => {
        if (!selectedPatient) 
            return;
        


        const response = await fetch(`/api/patients/${
            selectedPatient.id
        }`, {method: "DELETE"});

        if (! response.ok) {
            console.error("Failed to delete patient");
            showToast("Failed to delete patient", "error");
            return;
        }

        mutate((key) => typeof key === "string" && key.startsWith("/api/patients"), undefined, {
            revalidate: true
        },);
        setIsDeleteModalOpen(false);
        setSelectedPatient(null);
        showToast("Patient deleted successfully", "success");
    };

    const columnHelper = createColumnHelper < Patient > ();

    const columns = useMemo(() => [
        columnHelper.accessor("firstname", {
            header: "First Name",
            cell: (info) => info.getValue()
        }),
        columnHelper.accessor("lastname", {
            header: "Last Name",
            cell: (info) => info.getValue()
        }),
        columnHelper.accessor("gender", {
            header: "Gender",
            cell: (info) => info.getValue()
        }),
        columnHelper.accessor("dob", {
            header: "Date of Birth",
            cell: (info) => new Date(info.getValue()).toLocaleDateString()
        }),
        columnHelper.accessor("phone", {
            header: "Phone",
            cell: (info) => {
                const patient = info.row.original;
                return `${
                    patient.countryCode
                } ${
                    info.getValue()
                }`;
            }
        }),
        columnHelper.accessor("insuranceType", {
            header: "Insurance",
            cell: (info) => info.getValue()
        }),
        columnHelper.accessor("createdAt", {
            header: "Created At",
            cell: (info) => new Date(info.getValue()).toLocaleDateString()
        }),

        columnHelper.display(
            {
                id: "actions",
                header: "Actions",
                cell: (props) => (
                    <div className="flex gap-2">
                        <button onClick={
                                () => {
                                    setSelectedPatientId(props.row.original.id);
                                    setIsViewModalOpen(true);
                                }
                            }
                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                            title="View">
                            <EyeIcon className="w-5 h-5"/>
                        </button>
                        <button onClick={
                                () => {
                                    setSelectedPatient(props.row.original);
                                    setIsEditModalOpen(true);
                                }
                            }
                            className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
                            title="Edit">
                            <PencilSquareIcon className="w-5 h-5"/>
                        </button>
                        <button onClick={
                                () => {
                                    setSelectedPatient(props.row.original);
                                    setIsDeleteModalOpen(true);
                                }
                            }
                            className="p-1 text-red-600 hover:text-red-800 transition-colors"
                            title="Delete">
                            <TrashIcon className="w-5 h-5"/>
                        </button>
                    </div>
                )
            }
        ),
    ], [],);

    // Check for permission error
    if (error && (error.message ?. includes("Forbidden") || error.message ?. includes("permission"))) {
        return <PermissionDenied moduleName="Dashboard"/>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            </div>

            {/* Search and Filter Controls */}
            <div className="mb-6 flex flex-col sm:flex-row gap-3">
                {/* Date Range Filters */}
                <div className="flex gap-2">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            From Date
                        </label>
                        <input type="date"
                            value={
                                filterState.startDate
                            }
                            onChange={
                                (e) => setFilters({startDate: e.target.value})
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"/>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            To Date
                        </label>
                        <input type="date"
                            value={
                                filterState.endDate
                            }
                            onChange={
                                (e) => setFilters({endDate: e.target.value})
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"/>
                    </div>
                </div>

                {/* Search Input */}
                <div className="relative flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Search Patients
                    </label>
                    <input type="text" placeholder="Search patients..."
                        value={
                            filterState.search
                        }
                        onChange={
                            (e) => setFilters({search: e.target.value})
                        }
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    <svg className="absolute left-3 bottom-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    {
                    filterState.search && (
                        <button onClick={
                                () => setFilters({search: ""})
                            }
                            className="absolute right-3 bottom-2.5 text-gray-400 hover:text-gray-600">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    )
                } </div>

                {/* Action Buttons */}
                <div className="flex items-end gap-2">
                    {
                    (filterState.startDate || filterState.endDate || filterState.search) && (
                        <button onClick={resetFilters}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors">
                            Clear Filters
                        </button>
                    )
                }
                    <button onClick={
                            () => setIsCreateModalOpen(true)
                        }
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                        <PlusIcon className="w-5 h-5"/>
                        Create Patient
                    </button>
                </div>
            </div>

            {
            isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <Table data={patients}
                    columns={columns}/>
            )
        }

            {/* Create Modal */}
            <CreatePatientModal isOpen={isCreateModalOpen}
                onClose={
                    () => setIsCreateModalOpen(false)
                }/> {/* Edit Modal */}
            <EditPatientModal isOpen={isEditModalOpen}
                onClose={
                    () => {
                        setIsEditModalOpen(false);
                        setSelectedPatient(null);
                    }
                }
                patientId={
                    selectedPatient ?. id ?? null
                }
                onSuccess={
                    () => {
                        setIsEditModalOpen(false);
                        setSelectedPatient(null);
                    }
                }/> {/* View Modal */}
            {
            selectedPatientId && (
                <ViewPatientModal patientId={selectedPatientId}
                    onClose={
                        () => {
                            setIsViewModalOpen(false);
                            setSelectedPatientId(null);
                        }
                    }/>
            )
        }

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen}
                onClose={
                    () => {
                        setIsDeleteModalOpen(false);
                        setSelectedPatient(null);
                    }
                }
                title="Delete Patient">
                <div className="space-y-4">
                    <p className="text-gray-600">
                        Are you sure you want to delete patient{" "}
                        <strong> {
                            selectedPatient ?. firstname
                        }
                            {
                            selectedPatient ?. lastname
                        } </strong>
                        ? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button onClick={
                                () => {
                                    setIsDeleteModalOpen(false);
                                    setSelectedPatient(null);
                                }
                            }
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Cancel
                        </button>
                        <button onClick={handleDeletePatient}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
