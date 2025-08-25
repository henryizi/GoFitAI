export interface BodyPhoto {
  id: string;
  user_id: string;
  photo_type: 'front' | 'back';
  photo_url: string;
  storage_path: string;
  uploaded_at: string;
  is_analyzed: boolean;
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface BodyAnalysis {
  id: string;
  user_id: string;
  photo_session_id: string;
  chest_rating: number;
  arms_rating: number;
  back_rating: number;
  legs_rating: number;
  waist_rating: number;
  overall_rating: number;
  strongest_body_part: string;
  weakest_body_part: string;
  ai_feedback: string;
  analysis_data: AnalysisData;
  created_at: string;
}

export interface AnalysisData {
  body_part_details: {
    chest: BodyPartDetail;
    arms: BodyPartDetail;
    back: BodyPartDetail;
    legs: BodyPartDetail;
    waist: BodyPartDetail;
  };
  symmetry_score: number;
  proportion_score: number;
  overall_aesthetic_score: number;
  recommendations: string[];
}

export interface BodyPartDetail {
  rating: number;
  strength: number;
  definition: number;
  symmetry: number;
  feedback: string;
  improvement_suggestions: string[];
}

export interface PhotoSession {
  id: string;
  user_id: string;
  front_photo: BodyPhoto;
  back_photo: BodyPhoto;
  analysis: BodyAnalysis | null;
  created_at: string;
} 