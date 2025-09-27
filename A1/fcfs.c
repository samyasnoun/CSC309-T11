/*
 * fcfs.c
 *
 * Implementation of a first-come first-served scheduler.
 * Becomes round-robin once preemption is enabled.
 */

#include "ut369.h"
#include "queue.h"
#include "thread.h"
#include "schedule.h"
#include <stdlib.h>
#include <assert.h>

static fifo_queue_t *readyq;

int 
fcfs_init(void)
{
    assert(readyq == NULL);
    readyq = queue_create(THREAD_MAX_THREADS);
    return readyq ? 0 : THREAD_NOMEMORY;
}

int
fcfs_enqueue(struct thread * thread)
{
    assert(readyq != NULL);
    assert(thread != NULL);
    return (queue_push(readyq, thread) == 0) ? 0 : THREAD_NOMORE;
}

struct thread *
fcfs_dequeue(void)
{
    assert(readyq != NULL);
    return queue_pop(readyq);   
}

struct thread *
fcfs_remove(Tid tid)
{
    assert(readyq != NULL);
    return queue_remove(readyq, tid); 
}

void
fcfs_destroy(void)
{
    if (readyq) {
        queue_destroy(readyq);
        readyq = NULL;
    }
}