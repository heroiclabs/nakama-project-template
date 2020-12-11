function rpcReward(context: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    if (!context.userId) {
        throw Error('No user ID in context');
    }

    if (payload){
        throw Error('no input allowed');
    }

    var objectId: nkruntime.StorageReadRequest = {
        collection: 'reward',
        key: 'daily',
        userId: context.userId,
    }
    var objects: nkruntime.StorageObject[];
    try {
        objects = nk.storageRead([objectId]);
    } catch(error) {
        logger.error('storageRead error: %s', objects);
        throw error;
    }

    var dailyReward: any = {
        lastClaimUnix: 0,
    }
    objects.forEach(object => {
        if (object.key == 'daily') {
            dailyReward = object.value;
        }
    });

    var resp = {
        coinsReceived: 0,
    }

    var d = new Date();
    d.setHours(0,0,0,0);

    // If last claimed is before the new day grant a new reward!
    if (dailyReward.lastClaimUnix < msecToSec(d.getTime())) {
        resp.coinsReceived = 500;

        // Update player wallet.
        var changeset = {
            coins: resp.coinsReceived,
        }
        try {
            nk.walletUpdate(context.userId, changeset, {}, false);
        } catch (error) {
            logger.error('walletUpdate error: %q', error);
            throw error;
        }

        var notification: nkruntime.Notification = {
            code: 1001,
            content: changeset,
            persistent: true,
            sender: '',
            subject: "You've received your daily reward!",
            userID: context.userId,
        }
        try {
            nk.notificationsSend([notification]);
        } catch (error) {
            logger.error('notificationsSend error: %q', error);
        }

        dailyReward.lastClaimUnix = msecToSec(Date.now());

        var write: nkruntime.StorageWriteRequest = {
            collection: 'reward',
            key: 'daily',
            permissionRead: 1,
            permissionWrite: 0,
            value: dailyReward,
            userId: context.userId,
        }
        if (objects.length > 0) {
            write.version = objects[0].version
        }

        try {
            nk.storageWrite([write])
        } catch (error) {
            logger.error('storageWrite error: %q', error);
            throw error;
        }
    }

    var result = JSON.stringify(resp);

    logger.debug('rpcReward resp: %q', result)

    return result;
}

function msecToSec(n: number): number {
    return Math.floor(n / 1000);
}
