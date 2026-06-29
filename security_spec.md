# Security Specification - Community Hero

## Data Invariants
1. A user can only create their own profile and it must start with a default role (citizen) or be set by an admin.
2. An issue must be reported by a valid authenticated user.
3. Only the reporter or an administrator can update an issue, with specific field restrictions.
4. Resolution proof (resolvedImageUrl) can only be added when status is moving to 'resolved'.
5. Budget and suggestions can only be updated by users with the 'administration' role.

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Attempt to create a profile for another UID.
2. **Privilege Escalation**: Citizen attempting to update their own role to 'administration'.
3. **Role Hijacking**: Citizen attempting to update another user's role.
4. **Orphaned Issue**: Creating an issue with a `reportedBy` UID that doesn't match the current user.
5. **Illegal State Transition**: Citizen marking an issue as 'resolved' without proof.
6. **Admin Data Tampering**: Citizen attempting to update the `budget` or `suggestions` fields.
7. **Resource Poisoning**: Injecting a 2MB string into the `title` field.
8. **Malicious ID**: Using `../illegal/path` as a document ID.
9. **Fake Resolution**: Marking an issue as resolved but not providing `resolvedImageUrl`.
10. **Vote Manipulation**: A user attempting to set `votesCount` to 9999 directly.
11. **Timestamp Forgery**: Providing a backdated `createdAt` timestamp.
12. **Unauthorized Deletion**: Citizen attempting to delete an issue they didn't report.

## Test Runner (Logic)
- `users/{uid}`: `create` allows only if `request.auth.uid == uid` and `role == 'citizen'`.
- `users/{uid}`: `update` allows only if `isAdmin()` or (isOwner and only allowed fields changed).
- `issues/{id}`: `create` allows only if `incoming().reportedBy == request.auth.uid`.
- `issues/{id}`: `update`:
    - If `role == 'citizen'`: Can only update `title`, `description`, `imageUrl`, `status` (if proof provided), `votesCount` (increment only).
    - If `role == 'administration'`: Can update `budget`, `suggestions`, `status`, `impactScore`.
