"use server";

import { createClient } from "@/utils/supabase/server";

// Server action to get all cars (with optional search)
export async function getCars(searchTerm = "") {
  const supabase = await createClient();
  let query = supabase.from("Cars").select("*");

  if (searchTerm) {
    query = query.ilike("car_name", `%${searchTerm}%`);
  }

  const { data, error } = await query.order("car_name");

  if (error) throw new Error(error.message);
  return data || [];
}

// Server action to get paginated cars
export async function getCarsPaginated(
  page: number,
  pageSize: number,
  searchTerm = ""
) {
  const supabase = await createClient();
  let query = supabase.from("Cars").select("*");

  if (searchTerm) {
    query = query.ilike("car_name", `%${searchTerm}%`);
  }

  const { data, error } = await query
    .order("car_name")
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) throw new Error(error.message);
  return data || [];
}

// Server action to get car count (for pagination)
export async function getCarsCount(searchTerm = "") {
  const supabase = await createClient();
  let query = supabase.from("Cars").select("*", { count: "exact", head: true });

  if (searchTerm) {
    query = query.ilike("car_name", `%${searchTerm}%`);
  }

  const { count, error } = await query;

  if (error) throw new Error(error.message);
  return count || 0;
}
