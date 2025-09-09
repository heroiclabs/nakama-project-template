# Nakama Server Hooks

## Introduction

Hooks are a feature of the Nakama server runtime that allow you to run custom code before or after server events occur. Hooks help:
- Validate and verify input data
- Customize processing logic
- Log and monitor activities
- Ensure data consistency
- Integrate with external systems

## Types of Hooks

### 1. Before Hooks

Execute before an event occurs. They can:
- Check and modify input data
- Reject invalid requests
- Apply custom logic

### 2. After Hooks

Execute after an event has occurred. Used to:
- Log activities
- Update related data
- Send notifications
- Synchronize with external systems

### 3. RPC Hooks

Register functions that can be called directly from the client.

### 4. Event Hooks

Handle special server events:
- Leaderboard reset
- Tournament end/reset
- Matchmaker matched
- Server shutdown
- Purchase notifications

## Complete List of Before/After Hooks

### Standard Hooks

```typescript
// Authentication and accounts
initializer.registerBeforeAuthenticateApple()
initializer.registerAfterAuthenticateApple()
initializer.registerBeforeAuthenticateCustom()
initializer.registerAfterAuthenticateCustom()
initializer.registerBeforeAuthenticateDevice()
initializer.registerAfterAuthenticateDevice()
initializer.registerBeforeAuthenticateEmail()
initializer.registerAfterAuthenticateEmail()
initializer.registerBeforeAuthenticateFacebook()
initializer.registerAfterAuthenticateFacebook()
initializer.registerBeforeAuthenticateFacebookInstantGame()
initializer.registerAfterAuthenticateFacebookInstantGame()
initializer.registerBeforeAuthenticateGameCenter()
initializer.registerAfterAuthenticateGameCenter()
initializer.registerBeforeAuthenticateGoogle()
initializer.registerAfterAuthenticateGoogle()
initializer.registerBeforeAuthenticateSteam()
initializer.registerAfterAuthenticateSteam()
initializer.registerBeforeListUserAccount()
initializer.registerAfterListUserAccount()
initializer.registerBeforeGetAccount()
initializer.registerAfterGetAccount()
initializer.registerBeforeUpdateAccount()
initializer.registerAfterUpdateAccount()
initializer.registerBeforeDeleteAccount()
initializer.registerAfterDeleteAccount()

// Friends
initializer.registerBeforeAddFriends()
initializer.registerAfterAddFriends()
initializer.registerBeforeDeleteFriend()
initializer.registerAfterDeleteFriend()
initializer.registerBeforeBlockFriends()
initializer.registerAfterBlockFriends()
initializer.registerBeforeImportFacebookFriends()
initializer.registerAfterImportFacebookFriends()
initializer.registerBeforeListFriends()
initializer.registerAfterListFriends()

// Groups
initializer.registerBeforeCreateGroup()
initializer.registerAfterCreateGroup()
initializer.registerBeforeUpdateGroup()
initializer.registerAfterUpdateGroup()
initializer.registerBeforeDeleteGroup()
initializer.registerAfterDeleteGroup()
initializer.registerBeforeJoinGroup()
initializer.registerAfterJoinGroup()
initializer.registerBeforeLeaveGroup()
initializer.registerAfterLeaveGroup()
initializer.registerBeforeAddGroupUsers()
initializer.registerAfterAddGroupUsers()
initializer.registerBeforeBanGroupUsers()
initializer.registerAfterBanGroupUsers()
initializer.registerBeforePromoteGroupUsers()
initializer.registerAfterPromoteGroupUsers()

// Leaderboards and tournaments
initializer.registerBeforeListLeaderboardRecords()
initializer.registerAfterListLeaderboardRecords()
initializer.registerBeforeWriteLeaderboardRecord()
initializer.registerAfterWriteLeaderboardRecord()
initializer.registerBeforeListTournaments()
initializer.registerAfterListTournaments()
initializer.registerBeforeJoinTournament()
initializer.registerAfterJoinTournament()
initializer.registerBeforeWriteTournamentRecord()
initializer.registerAfterWriteTournamentRecord()

// Storage
initializer.registerBeforeReadStorageObjects()
initializer.registerAfterReadStorageObjects()
initializer.registerBeforeWriteStorageObjects()
initializer.registerAfterWriteStorageObjects()
initializer.registerBeforeDeleteStorageObjects()
initializer.registerAfterDeleteStorageObjects()

// Wallet
initializer.registerBeforeWalletUpdate()
initializer.registerAfterWalletUpdate()
initializer.registerBeforeWalletLedgerList()
initializer.registerAfterWalletLedgerList()
```

### Realtime Hooks

```typescript
// Chat channels
initializer.registerRtBefore("ChannelJoin")
initializer.registerRtAfter("ChannelJoin")
initializer.registerRtBefore("ChannelLeave")
initializer.registerRtAfter("ChannelLeave")
initializer.registerRtBefore("ChannelMessageSend")
initializer.registerRtAfter("ChannelMessageSend")
initializer.registerRtBefore("ChannelMessageUpdate")
initializer.registerRtAfter("ChannelMessageUpdate")
initializer.registerRtBefore("ChannelMessageRemove")
initializer.registerRtAfter("ChannelMessageRemove")

// Match
initializer.registerRtBefore("MatchCreate")
initializer.registerRtAfter("MatchCreate")
initializer.registerRtBefore("MatchDataSend")
initializer.registerRtAfter("MatchDataSend")
initializer.registerRtBefore("MatchJoin")
initializer.registerRtAfter("MatchJoin")
initializer.registerRtBefore("MatchLeave")
initializer.registerRtAfter("MatchLeave")

// Matchmaker
initializer.registerRtBefore("MatchmakerAdd")
initializer.registerRtAfter("MatchmakerAdd")
initializer.registerRtBefore("MatchmakerRemove")
initializer.registerRtAfter("MatchmakerRemove")

// Party
initializer.registerRtBefore("PartyCreate")
initializer.registerRtAfter("PartyCreate")
initializer.registerRtBefore("PartyJoin")
initializer.registerRtAfter("PartyJoin")
initializer.registerRtBefore("PartyLeave")
initializer.registerRtAfter("PartyLeave")
initializer.registerRtBefore("PartyPromote")
initializer.registerRtAfter("PartyPromote")
initializer.registerRtBefore("PartyAccept")
initializer.registerRtAfter("PartyAccept")
initializer.registerRtBefore("PartyRemove")
initializer.registerRtAfter("PartyRemove")
initializer.registerRtBefore("PartyClose")
initializer.registerRtAfter("PartyClose")
initializer.registerRtBefore("PartyJoinRequestList")
initializer.registerRtAfter("PartyJoinRequestList")
initializer.registerRtBefore("PartyMatchmakerAdd")
initializer.registerRtAfter("PartyMatchmakerAdd")
initializer.registerRtBefore("PartyMatchmakerRemove")
initializer.registerRtAfter("PartyMatchmakerRemove")
initializer.registerRtBefore("PartyDataSend")
initializer.registerRtAfter("PartyDataSend")

// Status
initializer.registerRtBefore("StatusFollow")
initializer.registerRtAfter("StatusFollow")
initializer.registerRtBefore("StatusUnfollow")
initializer.registerRtAfter("StatusUnfollow")
initializer.registerRtBefore("StatusUpdate")
initializer.registerRtAfter("StatusUpdate")
```

### Event Hooks

```typescript
// Leaderboard reset events
initializer.registerLeaderboardReset()

// Tournament reset or end events
initializer.registerTournamentReset()
initializer.registerTournamentEnd()

// Matchmaker matched event
initializer.registerMatchmakerMatched()

// Server shutdown event
initializer.registerShutdown()

// Purchase notification events
initializer.registerPurchaseNotificationApple()
initializer.registerPurchaseNotificationGoogle()
initializer.registerSubscriptionNotificationApple()
initializer.registerSubscriptionNotificationGoogle()
```

## Hook Usage Examples

### Before Hook Example

```typescript
// Check permissions before creating a group
function beforeCreateGroup(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: any) {
  // Check if the user has permission to create a group
  const account = nk.accountGetId(ctx.userId);
  
  if (account.user.metadata.role !== 'admin') {
    // Reject the request if not an admin
    logger.info(`User ${ctx.userId} does not have permission to create a group`);
    return null; // Return null to reject the request
  }
  
  // Allow processing to continue
  return data;
}

// Register the hook in InitModule
initializer.registerBeforeCreateGroup(beforeCreateGroup);
```

### After Hook Example - Solving Data Consistency Issues

```typescript
// Ensure daily reward claim time is updated after wallet has been updated
function afterWalletUpdate(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: any) {
  // Check if the wallet update is from the reward system
  if (data.metadata && data.metadata.source === "daily_reward") {
    try {
      // Update the latest claim time
      const lastClaimTime = Math.floor(Date.now() / 1000);
      
      const writeObj: nkruntime.StorageWriteRequest = {
        collection: "reward",
        key: "daily",
        userId: ctx.userId!,
        value: { lastClaimUnix: lastClaimTime },
        permissionRead: 1,
        permissionWrite: 0,
      };
      
      // Write the new claim time
      nk.storageWrite([writeObj]);
      
      logger.info("Successfully recorded reward claim time for user: " + ctx.userId);
    } catch (error) {
      logger.error("Failed to record reward claim time: " + error);
      // Log the error but don't affect the wallet update result
    }
  }
}

// Register the hook in InitModule
initializer.registerAfterWalletUpdate(afterWalletUpdate);
```

### RPC Hook Example

```typescript
function rpcGetRewardStatus(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  if (!ctx.userId) {
    throw Error("No user ID in context");
  }

  // Read reward status
  const storageObjects = nk.storageRead([{
    collection: "reward",
    key: "daily",
    userId: ctx.userId
  }]);

  const now = Math.floor(Date.now() / 1000);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayTimestamp = Math.floor(startOfDay.getTime() / 1000);

  let response: any = {
    canClaimReward: true,
    lastClaimTime: 0,
    nextClaimTime: startOfDayTimestamp,
    timeUntilNextClaim: 0
  };

  if (storageObjects.length > 0) {
    const rewardData = storageObjects[0].value;
    response.lastClaimTime = rewardData.lastClaimUnix;
    
    // Check if reward has already been claimed today
    if (rewardData.lastClaimUnix >= startOfDayTimestamp) {
      response.canClaimReward = false;
      
      // Calculate time until tomorrow
      const tomorrow = new Date(startOfDay);
      tomorrow.setDate(tomorrow.getDate() + 1);
      response.nextClaimTime = Math.floor(tomorrow.getTime() / 1000);
      response.timeUntilNextClaim = response.nextClaimTime - now;
    }
  }

  return JSON.stringify(response);
}

// Register RPC hook in InitModule
initializer.registerRpc("get_reward_status", rpcGetRewardStatus);
```

## Best Practices

1. **Handle Errors Properly**
   - Always catch and handle exceptions
   - Log detailed error information
   - Return meaningful error messages

2. **Ensure Data Consistency**
   - Use after hooks to ensure related operations are performed after the main activity succeeds
   - Consider the order of operations

3. **Performance**
   - Avoid performing resource-intensive operations in hooks
   - Use afterHooks instead of beforeHooks for operations not related to validation

4. **Security**
   - Use beforeHooks for authentication and permission checks
   - Don't trust client data

5. **Logging**
   - Log thoroughly for debugging purposes
   - Use appropriate log levels (debug, info, warn, error)

## References

- [Nakama Server Documentation - Hooks](https://heroiclabs.com/docs/nakama/server-framework/introduction/hooks/)
- [Using Hooks Guide](https://heroiclabs.com/docs/nakama/guides/server-framework/using-hooks/)
- [TypeScript Function Reference](https://heroiclabs.com/docs/nakama/server-framework/typescript-runtime/function-reference/) 