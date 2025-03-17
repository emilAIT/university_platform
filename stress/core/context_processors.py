def notifications_context(request):
    if request.user.is_authenticated:
        has_unread_notifications = request.user.notifications.filter(is_read=False).exists()
    else:
        has_unread_notifications = False
    return {
        'has_unread_notifications': has_unread_notifications,
    }