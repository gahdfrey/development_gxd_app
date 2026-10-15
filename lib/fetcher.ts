
/** Thrown by `fetcher` for a non-2xx response; carries the status and the response body. */
export class FetchError extends Error {
    constructor(public status: number, public info: unknown) {
        super('An error occurred while fetching the data.');
    }
}

export const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new FetchError(res.status, await res.json());
    }
    return res.json();
};
