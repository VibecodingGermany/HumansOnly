"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContext, useEffect } from "react";

import { AuthContext } from "../layout";
import { getNotifications, markNotificationsRead } from "@/utilities/fetch";
import CircularLoading from "@/components/misc/CircularLoading";
import NothingToShow from "@/components/misc/NothingToShow";
import { NotificationProps } from "@/types/NotificationProps";
import Notification from "@/components/misc/Notification";

export default function NotificationsPage() {
    const { token, isPending } = useContext(AuthContext);

    const queryClient = useQueryClient();

    const { isLoading, isError, data, isFetched } = useQuery({
        queryKey: ["notifications"],
        queryFn: getNotifications,
        enabled: !!token,
    });

    const mutation = useMutation({
        mutationFn: markNotificationsRead,
        onSuccess: () => {
            queryClient.invalidateQueries(["notifications"]);
        },
        onError: (error) => console.log(error),
    });

    const handleNotificationsRead = () => {
        mutation.mutate();
    };

    useEffect(() => {
        if (
            isFetched &&
            data?.notifications &&
            data.notifications.filter((notification: NotificationProps) => !notification.isRead).length > 0
        ) {
            const countdownForMarkAsRead = setTimeout(() => {
                handleNotificationsRead();
            }, 1000);

            return () => {
                clearTimeout(countdownForMarkAsRead);
            };
        }
    }, [data?.notifications, isFetched]);

    if (isPending) return <CircularLoading />;
    if (!token) {
        return (
            <main>
                <h1 className="page-name">Notifications</h1>
                <p className="text-muted">Sign in to view your notifications.</p>
            </main>
        );
    }
    if (isLoading) return <CircularLoading />;
    if (isError || !data) {
        return (
            <main>
                <h1 className="page-name">Notifications</h1>
                <p className="text-muted">Could not load notifications right now.</p>
            </main>
        );
    }

    return (
        <main>
            <h1 className="page-name">Notifications</h1>
            {isFetched && data.notifications.length === 0 ? (
                <NothingToShow />
            ) : (
                <div className="notifications-wrapper">
                    {data.notifications.map((notification: NotificationProps) => (
                        <Notification key={notification.id} notification={notification} token={token} />
                    ))}
                </div>
            )}
        </main>
    );
}
