#include "SeedGenesisGameMode.h"
#include "SeedWorldDirector.h"

#include "Camera/CameraActor.h"
#include "Camera/CameraComponent.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"

void ASeedGenesisGameMode::BeginPlay()
{
    Super::BeginPlay();

    UWorld* World = GetWorld();
    if (!World)
    {
        return;
    }

    WorldDirector = World->SpawnActor<ASeedWorldDirector>();
    ACameraActor* Camera = World->SpawnActor<ACameraActor>();
    if (Camera)
    {
        const FVector CameraLocation(10400.f, -12600.f, 9300.f);
        Camera->SetActorLocation(CameraLocation);
        Camera->SetActorRotation((FVector(0.f, 0.f, 280.f) - CameraLocation).Rotation());
        Camera->GetCameraComponent()->FieldOfView = 52.f;

        if (APlayerController* Player = UGameplayStatics::GetPlayerController(World, 0))
        {
            Player->SetViewTarget(Camera);
        }
    }
}
