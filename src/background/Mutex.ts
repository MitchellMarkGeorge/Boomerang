// https://spin.atomicobject.com/2018/09/10/javascript-concurrency/
export class Mutex {
  private mutex = Promise.resolve();

  lock(): PromiseLike<() => void> {
    let begin: (unlock: () => void) => void = (unlock) => {};

    this.mutex = this.mutex.then(() => {
      return new Promise(begin);
    });

    return new Promise((res) => {
      begin = res;
    });
  }

  async dispatch<T>(fn: (() => T) | (() => PromiseLike<T>)): Promise<T> {
    const unlock = await this.lock();
    try {
      return await Promise.resolve(fn());
    } finally {
      unlock();
    }
  }
}

// https://stackoverflow.com/questions/63832831/testing-a-javascript-mutex-implementation
// export class Mutex {
//   private current = Promise.resolve();

//   async lock() {
//     let unlock: () => void;
//     const next = new Promise<void>((resolve) => {
//         // set the unlock function to be a function that resolves 
//       unlock = () => {
//         resolve();
//       };
//     });
//     const waiter = this.current.then(() => unlock); // create a promise that returns the unlock function when the current mutex iself is resolved
//     this.current = next; //
//     return await waiter; // wait for the current to be resolved (meaning its unlock function is called)
//   }
// }

// think of this type... should I use a generic instead?
type PromiseFunction = () => Promise<any>;

// inspired by https://blog.jcoglan.com/2016/07/12/mutexes-and-javascript/#:~:text=In%20threaded%20languages%2C%20one%20solution,threads%20must%20acquire%20the%20lock.
export class MutexQueue {

    private isBusy = false;
    private queue: PromiseFunction[] = [];

    public async sync(func: PromiseFunction) {
        this.queue.push(func);
        if (!this.isBusy) {
            await this.dequeue();
        }
    }

    // uses recuersion
    private async dequeue() {
        // use while loop?
        if (this.queue.length > 0) {
            // meaning there are still functions to be executed
            this.isBusy = true;
            let nextFunc = this.queue.shift();
            // technically not possible as we know it exists
            if (nextFunc) {
                await this.executeFunc(nextFunc);
            } else {
                this.isBusy = false;
            }
        } else {
            this.isBusy = false; // just to reset it
        }
    }

    private async executeFunc(func: PromiseFunction) {
        // how do we handle errors
        await func();
        await this.dequeue(); // try to continue
    }
}
