-- Create agents table
create table if not exists public.agents (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    description text,
    is_active boolean default true,
    configuration jsonb default '{}'::jsonb,
    training_files jsonb default '[]'::jsonb,  -- Array of file references {type: 'text|image|video|audio', url: string}
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users(id) not null
);

-- Create training files storage bucket
insert into storage.buckets (id, name, public) 
values ('agent-training-files', 'agent-training-files', false);

-- Enable RLS
alter table public.agents enable row level security;

-- Create policies
create policy "Enable read access for authenticated users" on public.agents
    for select
    using (auth.role() = 'authenticated');

create policy "Enable insert for authenticated users only" on public.agents
    for insert
    with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Enable update for own agents only" on public.agents
    for update
    using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Enable delete for own agents only" on public.agents
    for delete
    using (auth.role() = 'authenticated' and auth.uid() = user_id);

-- Storage policies
create policy "Allow authenticated users to upload files"
on storage.objects for insert
with check (
    auth.role() = 'authenticated' 
    and bucket_id = 'agent-training-files'
    and (storage.extension(name) = 'txt' 
        or storage.extension(name) = 'pdf'
        or storage.extension(name) = 'jpg'
        or storage.extension(name) = 'jpeg'
        or storage.extension(name) = 'png'
        or storage.extension(name) = 'mp4'
        or storage.extension(name) = 'mp3'
        or storage.extension(name) = 'wav')
);

create policy "Allow authenticated users to read own files"
on storage.objects for select
using (
    auth.role() = 'authenticated'
    and bucket_id = 'agent-training-files'
);

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger handle_agents_updated_at
    before update on public.agents
    for each row
    execute function public.handle_updated_at(); 