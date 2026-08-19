import { useEffect } from "react";

export function useSEO(title: string, description: string): void {
    useEffect(() => {
        const prevTitle = document.title;
        document.title = title;

        let meta = document.querySelector('meta[name="description"]');
        const created = !meta;
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'description');
            document.head.appendChild(meta);
        }
        const prevContent = meta.getAttribute('content');
        meta.setAttribute('content', description);

        return () => {
            document.title = prevTitle;
            if (created) {
                meta?.remove();
            } else if (prevContent !== null) {
                meta?.setAttribute('content', prevContent);
            }
        };
    }, [title, description]);
}