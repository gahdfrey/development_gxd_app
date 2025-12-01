'use client';

import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
    ColumnDef,
    SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

interface TableProps<T> {
    data: T[];
    columns: ColumnDef<T, any>[];
}

export default function Table<T>({ data, columns }: TableProps<T>) {
    const [sorting, setSorting] = useState<SortingState>([]);

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <div className="flex flex-col gap-4">
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        <div className="flex items-center gap-2">
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                            {{
                                                asc: ' 🔼',
                                                desc: ' 🔽',
                                            }[header.column.getIsSorted() as string] ?? null}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {table.getRowModel().rows.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                {row.getVisibleCells().map((cell) => (
                                    <td
                                        key={cell.id}
                                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 capitalize"
                                    >
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <button
                        className="p-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <button
                        className="p-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page{' '}
                    <span className="font-medium">
                        {table.getState().pagination.pageIndex + 1}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium">{table.getPageCount()}</span>
                </span>
            </div>
        </div>
    );
}
