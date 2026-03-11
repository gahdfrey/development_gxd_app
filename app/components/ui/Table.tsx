"use client";

import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
    ColumnDef,
    SortingState
} from "@tanstack/react-table";
import {useState, useEffect} from "react";
import {ChevronLeftIcon, ChevronRightIcon} from "@heroicons/react/20/solid";

interface TableProps < T > {
    data: T[];
    columns: ColumnDef < T,
    any > [];
    searchable?: boolean;
    searchPlaceholder?: string;
    onSearchChange?: (search : string) => void;
}

export default function Table < T > ({
    data,
    columns,
    searchable = false,
    searchPlaceholder = "Search...",
    onSearchChange
} : TableProps < T >) {const [sorting, setSorting] = useState < SortingState > ([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Debounce search
    useEffect(() => {
        if (!searchable || !onSearchChange) 
            return;
        


        const timer = setTimeout(() => {
            onSearchChange(searchQuery);
        }, 500);

        return() => clearTimeout(timer);
    }, [searchQuery, searchable, onSearchChange]);

    const table = useReactTable(
        {
            data,
            columns,
            state: {
                sorting
            },
            onSortingChange: setSorting,
            getCoreRowModel: getCoreRowModel(),
            getSortedRowModel: getSortedRowModel(),
            getPaginationRowModel: getPaginationRowModel(),
            initialState: {
                pagination: {
                    pageSize: 7
                }
            }
        }
    );

    return (
        <div className="flex flex-col gap-4">
            {/* Search Input */}
            {
            searchable && (
                <div className="relative w-64">
                    <input type="text"
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                        onChange={
                            (e) => setSearchQuery(e.target.value)
                        }
                        className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"/>
                    <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    {
                    searchQuery && (
                        <button onClick={
                                () => setSearchQuery("")
                            }
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    )
                } </div>
            )
        }

            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        {
                        table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {
                                headerGroup.headers.map((header) => (
                                    <th key={header.id}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={
                                            header.column.getToggleSortingHandler()
                                    }>
                                        <div className="flex items-center gap-2">
                                            {
                                            flexRender(header.column.columnDef.header, header.getContext(),)
                                        }
                                            {
                                            {
                                                asc: " 🔼",
                                                desc: " 🔽"
                                            }[header.column.getIsSorted()as string] ?? null
                                        } </div>
                                    </th>
                                ))
                            } </tr>
                        ))
                    } </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {
                        table.getRowModel().rows.map((row) => (
                            <tr key={row.id}
                                className="hover:bg-gray-50 transition-colors">
                                {
                                row.getVisibleCells().map((cell) => (
                                    <td key={cell.id}
                                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                                        {
                                        flexRender(cell.column.columnDef.cell, cell.getContext())
                                    } </td>
                                ))
                            } </tr>
                        ))
                    } </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <button className="p-2 rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={
                            () => table.previousPage()
                        }
                        disabled={
                            ! table.getCanPreviousPage()
                    }>
                        <ChevronLeftIcon className="w-5 h-5 text-gray-600"/>
                    </button>
                    <button className="p-2 rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={
                            () => table.nextPage()
                        }
                        disabled={
                            ! table.getCanNextPage()
                    }>
                        <ChevronRightIcon className="w-5 h-5 text-gray-600"/>
                    </button>
                </div>
                <span className="text-sm text-gray-700">
                    Page{" "}
                    <span className="font-medium">
                        {
                        table.getState().pagination.pageIndex + 1
                    } </span>
                    {" "}
                    of{" "}

                    <span className="font-medium">
                        {
                        table.getPageCount()
                    }</span>
                </span>
            </div>
        </div>
    );
}
